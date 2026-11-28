#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$( dirname "$SCRIPT_DIR" )" && pwd )"

case "$OSTYPE" in
  msys*|mingw*|cygwin*) IS_CYGWIN=1 ;;
esac

function makePath {
	local __assignTo=$1
	local __path=$2
	if [ ! -z $IS_CYGWIN ]; then
		__path="`cygpath -aw \"$__path\"`"
	fi
	eval $__assignTo="'$__path'"
}

if [ -z "$Z_EXECUTABLE" ]; then
	if [ "`uname`" == "Darwin" ]; then
		Z_EXECUTABLE="$ROOT_DIR/app/staging/Zotero.app/Contents/MacOS/zotero"
	else
		arch=""
		if [ "$(uname -m)" = "aarch64" ]; then
			arch="arm64"
		else
			arch="x86_64"
		fi
		Z_EXECUTABLE="$ROOT_DIR/app/staging/Zotero_linux-$arch/zotero"
	fi
fi

if [ -z "$DISPLAY" ]; then
	Z_ARGS=""
else
	Z_ARGS="--class=ZTestFirefox"
fi

function usage {
	cat >&2 <<DONE
Usage: $0 [option] [TESTS...]
Options
 -b                  skip bundled translator/style installation
 -c                  open JavaScript console and don't quit on completion
 -d LEVEL            enable debug logging
 -e TEST             end at the given test
 -f                  stop after first test failure
 -g                  only run tests matching the given pattern (grep)
 -h                  display this help
 -k                  accept failures listed in test/known-failures.txt
 -p SHARD/TOTAL      run only the given shard of the default test set (e.g., 2/4)
 -r RETRIES          retry failed tests the given number of times (default: 0)
 -s TEST             start at the given test
 -t                  generate test data and quit
 -x EXECUTABLE       path to Zotero executable (default: $Z_EXECUTABLE)
 TESTS               set of tests to run (default: all)
DONE
	exit 1
}

DEBUG=false
DEBUG_LEVEL=5
RETRIES=0
KNOWN_FAILURES=0
while getopts "bcd:e:fg:hkp:r:s:tx:" opt; do
	case $opt in
        b)
        	Z_ARGS="$Z_ARGS -ZoteroSkipBundledFiles"
        	;;
		c)
			Z_ARGS="$Z_ARGS -jsconsole -noquit"
			;;
		d)
			DEBUG=true
			DEBUG_LEVEL="$OPTARG"
			;;
		e)
			if [[ -z "$OPTARG" ]] || [[ ${OPTARG:0:1} = "-" ]]; then
				usage
			fi
			Z_ARGS="$Z_ARGS -stopAtTestFile $OPTARG"
			;;
		f)
			Z_ARGS="$Z_ARGS -bail"
			;;
		g)
			GREP="$OPTARG"
			;;
		h)
			usage
			;;
		k)
			KNOWN_FAILURES=1
			;;
		p)
			if [[ ! "$OPTARG" =~ ^[1-9][0-9]*/[1-9][0-9]*$ ]]; then
				usage
			fi
			Z_ARGS="$Z_ARGS -shard $OPTARG"
			;;
		r)
			RETRIES="$OPTARG"
			;;
		s)
			if [[ -z "$OPTARG" ]] || [[ ${OPTARG:0:1} = "-" ]]; then
				usage
			fi
			Z_ARGS="$Z_ARGS -startAtTestFile $OPTARG"
			;;
		t)
			Z_ARGS="$Z_ARGS -makeTestData"
			;;
		x)
			Z_EXECUTABLE="$OPTARG"
			;;
		*)
			usage
			;;
	esac
	shift $((OPTIND-1)); OPTIND=1
done

if [ -z $1 ]; then
	TESTS="all"
else
	ARGS=("${@:1}")
	function join { local IFS="$1"; shift; echo "$*"; }
	TESTS="$(join , "${ARGS[@]}")"
fi

# Increase open files limit
#
# Mozilla file functions (OS.File.move()/copy(), NetUtil.asyncFetch/asyncCopy()) can leave file
# descriptors open for a few seconds (even with an explicit inputStream.close() in the case of
# the latter), so a source installation that copies ~500 translators and styles (with fds for
# source and target) can exceed the default 1024 limit.
ulimit -n 4096

# Set up profile directory
TEMPDIR="`mktemp -d 2>/dev/null || mktemp -d -t 'zotero-unit'`"
PROFILE="$TEMPDIR/profile"
mkdir -p "$PROFILE"

makePath ZOTERO_PATH "$ROOT_DIR/build"

# Create data directory. Tests must never use the real ~/CiteWell library.
mkdir "$TEMPDIR/Zotero"
export XDG_CONFIG_HOME="$TEMPDIR/config"
mkdir -p "$XDG_CONFIG_HOME"

touch "$PROFILE/prefs.js"
cat <<EOF >> "$PROFILE/prefs.js"
user_pref("app.update.enabled", false);
//user_pref("dom.max_chrome_script_run_time", 0);
// It would be better to leave this on and handle it in Sinon's FakeXMLHttpRequest
user_pref("extensions.zotero.sync.server.compressData", false);
user_pref("extensions.zotero.automaticScraperUpdates", false);
user_pref("extensions.zotero.debug.log", $DEBUG);
user_pref("extensions.zotero.debug.level", $DEBUG_LEVEL);
user_pref("extensions.zotero.debug.time", $DEBUG);
user_pref("extensions.zotero.firstRun.skipFirefoxProfileAccessCheck", true);
user_pref("extensions.zotero.firstRunGuidance", false);
user_pref("extensions.zotero.firstRun2", false);
user_pref("extensions.zotero.reportTranslationFailure", false);
user_pref("extensions.zotero.httpServer.enabled", true);
user_pref("extensions.zotero.httpServer.port", 23124);	// ascii "ZT"
user_pref("extensions.zotero.httpServer.localAPI.enabled", true);
user_pref("extensions.zotero.backup.numBackups", 0);
user_pref("extensions.zotero.sync.autoSync", false);
user_pref("extensions.zoteroMacWordIntegration.installed", true);
user_pref("extensions.zoteroMacWordIntegration.skipInstallation", true);
user_pref("extensions.zoteroWinWordIntegration.skipInstallation", true);
user_pref("extensions.zoteroOpenOfficeIntegration.skipInstallation", true);
EOF

if [ -n "$CI" ]; then
	Z_ARGS="$Z_ARGS -ZoteroAutomatedTest -ZoteroTestTimeout 15000"
else
	Z_ARGS="$Z_ARGS -jsconsole"
fi

# Clean up on exit
trap "{ rm -rf \"$TEMPDIR\"; }" EXIT

if [[ -z "$CI" ]]; then
	echo
	echo "Running build process"
	cd "$ROOT_DIR"
	cargo run --quiet --manifest-path tools/Cargo.toml -p xtask -- build || exit $?
	echo
fi

ZOTERO_TEST=1 "$ROOT_DIR/app/scripts/dir_build"

makePath FX_PROFILE "$PROFILE"
TEST_LOG="$TEMPDIR/test-output.log"
set +e
MOZ_NO_REMOTE=1 NO_EM_RESTART=1 "$Z_EXECUTABLE" -profile "$FX_PROFILE" \
    -datadir "$TEMPDIR/Zotero" \
    -test "$TESTS" -grep "$GREP" -retries "$RETRIES" -ZoteroTest $Z_ARGS 2>&1 | tee "$TEST_LOG"
APP_STATUS=${PIPESTATUS[0]}
set -e

# Check for success
if test -e "$PROFILE/success"; then
	STATUS=0
else
	STATUS=1
fi

if [ $STATUS -ne 0 ] && [ $KNOWN_FAILURES -eq 1 ]; then
	KNOWN_FILE="$ROOT_DIR/test/known-failures.txt"
	if [ ! -f "$KNOWN_FILE" ]; then
		echo "No $KNOWN_FILE" >&2
		exit $STATUS
	fi
	if grep -q "FATAL ERROR\|Segmentation fault" "$TEST_LOG"; then
		echo "Test run aborted without a clean shutdown" >&2
		exit $STATUS
	fi
	FAILURES="$TEMPDIR/failures.txt"
	grep -a "✖ \[FAIL\]" "$TEST_LOG" \
		| sed -E 's/.*✖ \[FAIL\][[:space:]]*//; s/\x1B\[[0-9;]*[A-Za-z]//g; s/[[:space:]]+$//' \
		> "$FAILURES" || true
	UNKNOWN=0
	while IFS= read -r failure; do
		[ -z "$failure" ] && continue
		if ! grep -Fxq -- "$failure" "$KNOWN_FILE"; then
			echo "Unexpected failure: $failure" >&2
			UNKNOWN=1
		fi
	done < "$FAILURES"
	if [ $UNKNOWN -eq 0 ] && [ -s "$FAILURES" ]; then
		echo "All $(wc -l < "$FAILURES") failures are known (test/known-failures.txt)"
		exit 0
	fi
	exit $STATUS
fi

exit $STATUS
