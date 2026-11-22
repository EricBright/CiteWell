describe("Attention", function () {
	function FakeClock() {
		this.time = 0;
		this.nextID = 1;
		this.timers = new Map();
	}
	FakeClock.prototype.setTimeout = function (fn, delay) {
		var id = this.nextID++;
		this.timers.set(id, { at: this.time + delay, fn });
		return id;
	};
	FakeClock.prototype.clearTimeout = function (id) {
		this.timers.delete(id);
	};
	FakeClock.prototype.advance = function (ms) {
		var target = this.time + ms;
		while (true) {
			var due = [...this.timers.entries()]
				.filter(([, timer]) => timer.at <= target)
				.sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
			if (!due.length) break;
			var [id, timer] = due[0];
			this.timers.delete(id);
			this.time = timer.at;
			timer.fn();
		}
		this.time = target;
	};

	function Adapter() {
		this.calls = [];
		this.focused = false;
		this.failure = null;
		this.logs = [];
	}
	Adapter.prototype.isFocused = function () {
		if (this.failure === "isFocused") throw new Error("focus check failed");
		return this.focused;
	};
	Adapter.prototype.requestAttention = function (entry) {
		if (this.failure === "requestAttention") throw new Error("urgency failed");
		this.calls.push("urgency:" + entry.kind);
	};
	Adapter.prototype.escalate = function (entry) {
		this.calls.push("escalate:" + entry.surface);
	};
	Adapter.prototype.showBanner = function (entry) {
		this.calls.push("banner:" + entry.surface);
	};
	Adapter.prototype.setTitleCue = function (entry, active) {
		this.calls.push("title:" + active);
	};
	Adapter.prototype.clearTitleCue = function () {
		this.calls.push("title:clear");
	};
	Adapter.prototype.log = function (message, error) {
		this.logs.push([message, error && error.message]);
	};

	let clock, adapter, controller, win;

	beforeEach(function () {
		clock = new FakeClock();
		adapter = new Adapter();
		win = {};
		controller = new Zotero.Attention.Controller(adapter, { clock });
	});

	it("escalates a dialog on the 1/3/10 second ladder", function () {
		controller.watch(win);
		clock.advance(999);
		assert.deepEqual(adapter.calls, []);
		clock.advance(1);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true"]);
		clock.advance(1999);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true"]);
		clock.advance(1);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true", "escalate:app"]);
		clock.advance(7000);
		assert.deepEqual(
			adapter.calls,
			["urgency:dialog", "title:true", "escalate:app", "banner:app"]
		);
		assert.equal(controller.pendingCount(), 1);
	});

	it("cancels every escalation when the window receives focus", function () {
		controller.watch(win);
		clock.advance(1000);
		controller.focus(win);
		clock.advance(20000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true", "title:clear"]);
		assert.equal(controller.pendingCount(), 0);
	});

	it("does nothing when the window is already focused", function () {
		adapter.focused = true;
		controller.watch(win);
		clock.advance(20000);
		assert.deepEqual(adapter.calls, []);
		assert.equal(controller.pendingCount(), 0);
	});

	it("stops when the operation completes", function () {
		controller.watch(win);
		clock.advance(500);
		controller.close(win);
		clock.advance(20000);
		assert.deepEqual(adapter.calls, []);
		assert.equal(controller.pendingCount(), 0);
	});

	it("does not expose progress as an interactive prompt", function () {
		controller.watch(win, { kind: "progress" });
		clock.advance(3000);
		assert.deepEqual(adapter.calls, []);
		clock.advance(7000);
		assert.deepEqual(adapter.calls, ["banner:app"]);
	});

	it("uses the surface supplied by the caller", function () {
		controller.watch(win, { surface: "libreoffice" });
		clock.advance(3000);
		clock.advance(7000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true", "escalate:libreoffice", "banner:libreoffice"]);
	});

	it("keeps escalating after an adapter failure", function () {
		adapter.failure = "requestAttention";
		controller.watch(win);
		clock.advance(1000);
		assert.deepEqual(adapter.calls, ["title:true"]);
		assert.equal(adapter.logs.length, 1);
		clock.advance(2000);
		clock.advance(7000);
		assert.deepEqual(adapter.calls, ["title:true", "escalate:app", "banner:app"]);
	});

	it("does not duplicate the sequence for the same window", function () {
		controller.watch(win);
		controller.watch(win);
		clock.advance(1000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true"]);
	});


	function FakeWindow(options = {}) {
		this.listeners = {};
		this.closed = false;
		this.attentionCount = 0;
		this.document = {
			title: options.title || "Original title",
			readyState: options.readyState || "complete",
			hasFocus: () => !!options.focused,
		};
	}
	FakeWindow.prototype.addEventListener = function (name, fn) {
		(this.listeners[name] = this.listeners[name] || []).push(fn);
	};
	FakeWindow.prototype.dispatch = function (name) {
		for (let fn of this.listeners[name] || []) fn();
	};
	FakeWindow.prototype.getAttention = function () {
		this.attentionCount++;
	};
	FakeWindow.prototype.close = function () {
		this.closed = true;
		this.dispatch("unload");
	};

	it("exposes the default presenter used by the integration layer", function () {
		assert.isFunction(Zotero.Attention.getDefaultPresenter);
	});

	it("presents a parented modal dialog and attaches focus handling", function () {
		let win = new FakeWindow({ readyState: "loading" });
		let opened;
		let presenter = new Zotero.Attention.Presenter(adapter, {
			clock,
			openWindow: (parent, url, name, features) => {
				opened = { parent, url, name, features };
				return win;
			},
		});
		let parent = {};
		presenter.open({ url: "chrome://citewell/test.xhtml", name: "test", modal: true, parent });
		assert.equal(opened.parent, parent);
		assert.include(opened.features, "modal=yes");
		assert.include(opened.features, "dependent=yes");
		assert.notInclude(opened.features, "dialog=no");
		win.dispatch("load");
		clock.advance(1000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true"]);
		win.dispatch("focus");
		clock.advance(20000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true", "title:clear"]);
	});

	it("falls back to a Writer message when notification is unavailable", function () {
		let win = new FakeWindow();
		let messages = [];
		let appAdapter = new Zotero.Attention.AppAdapter({
			activate: () => {},
			showMessage: (entry, text) => messages.push(text),
		});
		let appClock = new FakeClock();
		let appController = new Zotero.Attention.Controller(appAdapter, { clock: appClock });
		appController.watch(win, { surface: "libreoffice" });
		appClock.advance(3000);
		assert.equal(messages.length, 0);
		appClock.advance(7000);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /behind another application/);
	});

	it("does not show a Writer message when the notification succeeded", function () {
		let win = new FakeWindow();
		let messages = [];
		let appAdapter = new Zotero.Attention.AppAdapter({
			activate: () => {},
			notify: () => {},
			showMessage: (entry, text) => messages.push(text),
		});
		let appClock = new FakeClock();
		let appController = new Zotero.Attention.Controller(appAdapter, { clock: appClock });
		appController.watch(win, { surface: "libreoffice" });
		appClock.advance(10000);
		assert.equal(messages.length, 0);
	});

	it("honours the test-only focus-denial hook", function () {
		let win = new FakeWindow({ focused: true });
		let denied = new Zotero.Attention.AppAdapter({
			forceUnfocused: true,
			activate: () => {},
			notify: () => {},
		});
		let appClock = new FakeClock();
		let appController = new Zotero.Attention.Controller(denied, { clock: appClock });
		appController.watch(win);
		appClock.advance(3000);
		assert.equal(appController.getEntry(win).focused, false);
	});

	it("opens an unparented dialog when the main window is minimized", function () {
		let win = new FakeWindow();
		let opened;
		let presenter = new Zotero.Attention.Presenter(adapter, {
			clock,
			activate: () => {},
			openWindow: (parent, url, name, features) => {
				opened = { parent, features };
				return win;
			},
		});
		presenter.open({
			url: "chrome://citewell/test.xhtml",
			modal: true,
			parent: { windowState: 1, STATE_MINIMIZED: 1 },
		});
		assert.isNull(opened.parent);
		assert.include(opened.features, "dialog=no");
		assert.notInclude(opened.features, "modal=yes");
	});

	it("does not focus a progress presenter on open", function () {
		let win = new FakeWindow();
		let activated = 0;
		let opened;
		let presenter = new Zotero.Attention.Presenter(adapter, {
			clock,
			activate: () => activated++,
			openWindow: (parent, url, name, features) => {
				opened = features;
				return win;
			},
		});
		presenter.open({
			url: "chrome://citewell/progress.xhtml",
			modal: false,
			focusOnOpen: false,
			kind: "progress",
		});
		assert.equal(activated, 0);
		assert.include(opened, "dialog=no");
		assert.notInclude(opened, "modal=yes");
		clock.advance(1000);
		assert.deepEqual(adapter.calls, []);
	});

	it("uses an app adapter for title cues, urgency and one notification", function () {
		let win = new FakeWindow();
		let activated = 0;
		let notifications = [];
		let appAdapter = new Zotero.Attention.AppAdapter({
			activate: () => activated++,
			notify: (entry, text) => notifications.push(text),
		});
		let appClock = new FakeClock();
		let appController = new Zotero.Attention.Controller(appAdapter, { clock: appClock });
		appController.watch(win);
		appClock.advance(1000);
		assert.equal(win.attentionCount, 1);
		assert.equal(activated, 0);
		assert.match(win.document.title, /CiteWell/);
		appClock.advance(2000);
		assert.equal(notifications.length, 1);
		appClock.advance(7000);
		assert.equal(notifications.length, 1);
		appController.focus(win);
		assert.equal(win.document.title, "Original title");
	});

	it("checks focus again at each stage", function () {
		controller.watch(win);
		clock.advance(1000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true"]);
		adapter.focused = true;
		clock.advance(2000);
		clock.advance(7000);
		assert.deepEqual(adapter.calls, ["urgency:dialog", "title:true", "title:clear"]);
		assert.equal(controller.pendingCount(), 0);
	});
});
