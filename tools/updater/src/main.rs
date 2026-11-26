//! citewell-update: verify a downloaded AppImage and install it over the running file.
//!
//! The app does the network work (resolving the release, downloading, reading the published
//! digests). This sidecar does the parts that must not race the running process: hashing the
//! bytes, checking the ELF and AppImage headers, waiting for the app to exit, the atomic
//! rename, and starting the new file.

use std::env;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use sha2::{Digest, Sha256};

const USAGE: &str = "\
Usage:
  citewell-update verify --file PATH --sha256 HEX [--sha256 HEX ...]
  citewell-update install --file PATH --target PATH --wait-pid PID
                         --sha256 HEX [--sha256 HEX ...]
                         [--arg VALUE ...] [--timeout-ms N] [--launch]

verify hashes the file, compares it with every expected SHA-256, and checks the ELF and
AppImage headers. install waits for PID to exit, renames the file over PATH, and optionally
starts it.
";

struct Opts {
	values: Vec<(String, String)>,
	flags: Vec<String>,
}

impl Opts {
	fn new(args: &[String]) -> Result<Self, String> {
		let mut values = Vec::new();
		let mut flags = Vec::new();
		let mut i = 0;
		while i < args.len() {
			let arg = &args[i];
			let key = arg
				.strip_prefix("--")
				.ok_or_else(|| format!("unexpected argument: {arg}"))?;
			if key == "launch" {
				flags.push(key.to_string());
				i += 1;
				continue;
			}
			let value = args
				.get(i + 1)
				.ok_or_else(|| format!("--{key} needs a value"))?;
			values.push((key.to_string(), value.clone()));
			i += 2;
		}
		Ok(Self { values, flags })
	}

	fn get(&self, key: &str) -> Option<&str> {
		self.values
			.iter()
			.find(|(k, _)| k == key)
			.map(|(_, v)| v.as_str())
	}

	fn require(&self, key: &str) -> Result<&str, String> {
		self.get(key)
			.ok_or_else(|| format!("--{key} is required"))
	}

	fn all(&self, key: &str) -> Vec<&str> {
		self.values
			.iter()
			.filter(|(k, _)| k == key)
			.map(|(_, v)| v.as_str())
			.collect()
	}

	fn has(&self, key: &str) -> bool {
		self.flags.iter().any(|f| f == key)
	}
}

fn main() {
	std::process::exit(run());
}

fn run() -> i32 {
	let args: Vec<String> = env::args().skip(1).collect();
	let Some(command) = args.first() else {
		eprint!("{USAGE}");
		return 1;
	};
	let result = match command.as_str() {
		"verify" => Opts::new(&args[1..]).and_then(|opts| verify(&opts)),
		"install" => Opts::new(&args[1..]).and_then(|opts| install(&opts)),
		other => {
			eprint!("unknown command: {other}\n\n{USAGE}");
			return 1;
		}
	};
	match result {
		Ok(()) => 0,
		Err(error) => {
			eprintln!("citewell-update: {error}");
			if error.starts_with("usage:") {
				1
			} else if error.contains("still running") {
				3
			} else {
				2
			}
		}
	}
}

/// Hash the file, compare it with every published digest, and check the headers.
fn verify(opts: &Opts) -> Result<(), String> {
	let file = opts.require("file")?;
	let expected = opts.all("sha256");
	if expected.is_empty() {
		return Err("usage: at least one --sha256 is required".into());
	}
	let actual = check_digests(Path::new(file), &expected)?;
	let size = check_appimage(Path::new(file))?;
	let mut out = std::io::stdout();
	let _ = writeln!(out, r#"{{"ok":true,"sha256":"{actual}","size":{size}}}"#);
	Ok(())
}

/// Wait for the app to exit, then replace the running file with the verified download.
fn install(opts: &Opts) -> Result<(), String> {
	let file = Path::new(opts.require("file")?);
	let target = Path::new(opts.require("target")?);
	let pid: u32 = opts
		.require("wait-pid")?
		.parse()
		.map_err(|_| "--wait-pid must be a process id".to_string())?;
	let expected = opts.all("sha256");
	if expected.is_empty() {
		return Err("usage: at least one --sha256 is required".into());
	}
	let timeout = opts
		.get("timeout-ms")
		.map(|v| v.parse::<u64>())
		.transpose()
		.map_err(|_| "--timeout-ms must be a number".to_string())?
		.map(Duration::from_millis)
		.unwrap_or(Duration::from_secs(30));

	let metadata = fs::symlink_metadata(file)
		.map_err(|e| format!("reading {}: {e}", file.display()))?;
	if !metadata.file_type().is_file() {
		return Err(format!("{} is not a regular file", file.display()));
	}
	if target.symlink_metadata().map(|m| m.file_type().is_symlink()).unwrap_or(false) {
		return Err(format!(
			"{} is a symlink; refusing to replace it",
			target.display()
		));
	}

	wait_for_exit(pid, timeout)?;

	// Re-check immediately before the rename. The app verified the same file in a separate
	// process, and this shrinks the window in which a corrupt or swapped file could reach
	// the target. It is a cheap integrity check, not a privilege boundary.
	check_digests(file, &expected)?;
	check_appimage(file)?;

	let mut perms = metadata.permissions();
	perms.set_mode(0o755);
	fs::set_permissions(file, perms).map_err(|e| format!("chmod {}: {e}", file.display()))?;

	fs::rename(file, target).map_err(|e| {
		format!(
			"renaming {} over {}: {e}; the old file is untouched",
			file.display(),
			target.display()
		)
	})?;

	if opts.has("launch") {
		let extra: Vec<String> = opts
			.all("arg")
			.into_iter()
			.map(str::to_string)
			.collect();
		launch(target, &extra)?;
	}

	let mut out = std::io::stdout();
	let _ = writeln!(out, r#"{{"ok":true,"installed":"{}"}}"#, target.display());
	Ok(())
}

fn check_digests(path: &Path, expected: &[&str]) -> Result<String, String> {
	let actual = hash_file(path).map_err(|e| format!("hashing {}: {e}", path.display()))?;
	for digest in expected {
		if !digest.eq_ignore_ascii_case(&actual) {
			return Err(format!(
				"sha256 mismatch: published {}, downloaded {actual}",
				digest.to_lowercase()
			));
		}
	}
	Ok(actual)
}

fn hash_file(path: &Path) -> std::io::Result<String> {
	let mut file = File::open(path)?;
	let mut hasher = Sha256::new();
	let mut buffer = vec![0u8; 1024 * 1024];
	loop {
		let read = file.read(&mut buffer)?;
		if read == 0 {
			break;
		}
		hasher.update(&buffer[..read]);
	}
	let digest = hasher.finalize();
	let mut hex = String::with_capacity(64);
	for byte in digest {
		hex.push_str(&format!("{byte:02x}"));
	}
	Ok(hex)
}

fn check_appimage(path: &Path) -> Result<u64, String> {
	let metadata =
		fs::symlink_metadata(path).map_err(|e| format!("reading {}: {e}", path.display()))?;
	if !metadata.file_type().is_file() {
		return Err(format!("{} is not a regular file", path.display()));
	}
	let size = metadata.len();
	if size < 64 {
		return Err("file is too small to be an AppImage".into());
	}
	let mut file = File::open(path).map_err(|e| format!("opening {}: {e}", path.display()))?;
	let mut head = [0u8; 64];
	file.read_exact(&mut head)
		.map_err(|e| format!("reading header of {}: {e}", path.display()))?;
	if &head[0..4] != b"\x7fELF" {
		return Err("not an ELF file".into());
	}
	if head[4] != 2 {
		return Err("not a 64-bit ELF".into());
	}
	if &head[8..11] != b"AI\x02" {
		return Err("not an AppImage of type 2".into());
	}
	let machine = u16::from_le_bytes([head[18], head[19]]);
	if machine != 0x3e {
		return Err(format!("ELF machine {machine:#x} is not x86-64"));
	}
	Ok(size)
}

fn wait_for_exit(pid: u32, timeout: Duration) -> Result<(), String> {
	let proc_path = PathBuf::from(format!("/proc/{pid}"));
	let start = Instant::now();
	while proc_path.exists() {
		if start.elapsed() >= timeout {
			return Err(format!(
				"process {pid} is still running after {} ms",
				timeout.as_millis()
			));
		}
		std::thread::sleep(Duration::from_millis(100));
	}
	Ok(())
}

fn launch(target: &Path, extra_args: &[String]) -> Result<(), String> {
	let mut command = Command::new(target);
	command.args(extra_args);
	command
		.stdin(Stdio::null())
		.stdout(Stdio::null())
		.stderr(Stdio::null());
	// The new file is started directly, not through the AppImage runtime, so the runtime's
	// environment must not leak into it.
	for var in ["APPIMAGE", "APPDIR", "APPIMAGE_EXTRACT_AND_RUN", "ARGV0", "OWD"] {
		command.env_remove(var);
	}
	command
		.spawn()
		.map(|_| ())
		.map_err(|e| format!("starting {}: {e}", target.display()))
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::io::Write;

	fn temp_dir(name: &str) -> PathBuf {
		let dir = env::temp_dir().join(format!(
			"citewell-update-test-{name}-{}",
			std::process::id()
		));
		let _ = fs::remove_dir_all(&dir);
		fs::create_dir_all(&dir).unwrap();
		dir
	}

	fn appimage_bytes() -> Vec<u8> {
		let mut bytes = vec![0u8; 4096];
		bytes[0..4].copy_from_slice(b"\x7fELF");
		bytes[4] = 2; // 64-bit
		bytes[8..11].copy_from_slice(b"AI\x02"); // AppImage type 2
		bytes[18..20].copy_from_slice(&0x3eu16.to_le_bytes()); // x86-64
		bytes
	}

	#[test]
	fn hashes_known_bytes() {
		let dir = temp_dir("hash");
		let path = dir.join("abc");
		File::create(&path).unwrap().write_all(b"abc").unwrap();
		assert_eq!(
			hash_file(&path).unwrap(),
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
		);
	}

	#[test]
	fn accepts_a_well_formed_appimage_header() {
		let dir = temp_dir("header-ok");
		let path = dir.join("image");
		fs::write(&path, appimage_bytes()).unwrap();
		assert_eq!(check_appimage(&path).unwrap(), 4096);
	}

	#[test]
	fn rejects_a_file_that_is_not_an_appimage() {
		let dir = temp_dir("header-bad");
		let path = dir.join("not-image");
		let mut bytes = appimage_bytes();
		bytes[8] = b'X';
		fs::write(&path, bytes).unwrap();
		assert!(check_appimage(&path).unwrap_err().contains("type 2"));
	}

	#[test]
	fn verify_requires_every_digest_to_match() {
		let dir = temp_dir("verify");
		let path = dir.join("image");
		fs::write(&path, appimage_bytes()).unwrap();
		let good = hash_file(&path).unwrap();
		let opts = Opts::new(&[
			"--file".into(),
			path.display().to_string(),
			"--sha256".into(),
			good.clone(),
			"--sha256".into(),
			good.clone(),
		])
		.unwrap();
		assert!(verify(&opts).is_ok());

		let opts = Opts::new(&[
			"--file".into(),
			path.display().to_string(),
			"--sha256".into(),
			good,
			"--sha256".into(),
			"00".repeat(32),
		])
		.unwrap();
		assert!(verify(&opts).unwrap_err().contains("sha256 mismatch"));
	}

	#[test]
	fn install_waits_then_replaces_the_target() {
		let dir = temp_dir("install");
		let target = dir.join("citewell.appimage");
		fs::write(&target, b"old").unwrap();
		let download = dir.join(".citewell-update-1");
		fs::write(&download, appimage_bytes()).unwrap();

		let dead_pid = std::process::id() + 100_000;
		let digest = hash_file(&download).unwrap();
		let opts = Opts::new(&[
			"--file".into(),
			download.display().to_string(),
			"--target".into(),
			target.display().to_string(),
			"--wait-pid".into(),
			dead_pid.to_string(),
			"--sha256".into(),
			digest,
		])
		.unwrap();
		install(&opts).unwrap();

		assert_eq!(fs::read(&target).unwrap(), appimage_bytes());
		assert!(!download.exists());
		let mode = fs::metadata(&target).unwrap().permissions().mode() & 0o777;
		assert_eq!(mode, 0o755);
	}

	#[test]
	fn install_refuses_a_wrong_digest_and_leaves_the_target() {
		let dir = temp_dir("install-bad");
		let target = dir.join("citewell.appimage");
		fs::write(&target, b"old").unwrap();
		let download = dir.join(".citewell-update-3");
		fs::write(&download, appimage_bytes()).unwrap();

		let opts = Opts::new(&[
			"--file".into(),
			download.display().to_string(),
			"--target".into(),
			target.display().to_string(),
			"--wait-pid".into(),
			"999999999".into(),
			"--sha256".into(),
			"00".repeat(32),
		])
		.unwrap();
		assert!(install(&opts).unwrap_err().contains("sha256 mismatch"));
		assert_eq!(fs::read(&target).unwrap(), b"old");
		assert!(download.exists());
	}

	#[test]
	fn refuses_a_symlink_target() {
		let dir = temp_dir("symlink");
		let real = dir.join("real");
		fs::write(&real, b"old").unwrap();
		let link = dir.join("link");
		std::os::unix::fs::symlink(&real, &link).unwrap();
		let download = dir.join(".citewell-update-2");
		fs::write(&download, appimage_bytes()).unwrap();

		let digest = hash_file(&download).unwrap();
		let opts = Opts::new(&[
			"--file".into(),
			download.display().to_string(),
			"--target".into(),
			link.display().to_string(),
			"--wait-pid".into(),
			"999999999".into(),
			"--sha256".into(),
			digest,
		])
		.unwrap();
		assert!(install(&opts).unwrap_err().contains("symlink"));
		assert!(download.exists(), "download must survive a refused install");
	}
}
