"use strict";

describe("Connector HTTP Integration Server", function () {
	var serverURL;
	
	before(function* () {
		this.timeout(20000);
		yield resetDB({
			thisArg: this,
			skipBundledFiles: true
		});
		
		serverURL = `http://127.0.0.1:${Zotero.Server.port}/connector/document`;
	});
	
	describe('/connector/document/execCommand', function () {
		it('should set HTTPIntegrationClient.inProgress=true and respond with a plugin command', async function () {
			let stub = sinon.stub(Zotero.Integration, 'execCommand');
			try {
				stub.callsFake(() => {
					let app = new Zotero.HTTPIntegrationClient.Application();
					app.getActiveDocument();
				});
				assert.isNotTrue(Zotero.HTTPIntegrationClient.inProgress);
				
				let response = await Zotero.HTTP.request(
					'POST',
					`${serverURL}/execCommand`,
					{
						headers: {
							"Content-Type": "application/json",
							"X-Zotero-Connector-API-Version": "2"
						},
						body: JSON.stringify({
							command: "addEditCitation",
							docId: "zoteroTestDoc",
						}),
					},
				);
				
				assert.isTrue(Zotero.HTTPIntegrationClient.inProgress);
				assert.equal(response.status, 200);
				assert.equal(JSON.parse(response.response).command, 'Application.getActiveDocument');
			}
			finally {
				stub.restore();
				Zotero.HTTPIntegrationClient.inProgress = false;
				Zotero.Integration.currentDoc = Zotero.Integration.currentSession = null;
			}
		});
	});
	
	describe('/connector/document/respond', function () {
		it('should pass along the request body via HTTPIntegrationClient', async function () {
			try {
				Zotero.HTTPIntegrationClient.deferredResponse = Zotero.Promise.defer();

				let postBody = { outputFormat: 'html' };
				Zotero.HTTP.request(
					'POST',
					`${serverURL}/respond`,
					{
						headers: {
							"Content-Type": "application/json",
							"X-Zotero-Connector-API-Version": "2"
						},
						body: JSON.stringify(postBody),
					},
				);
				
				let receivedBody = await Zotero.HTTPIntegrationClient.deferredResponse.promise;
				
				assert.deepEqual(postBody, receivedBody);
			}
			finally {
				Zotero.HTTPIntegrationClient.inProgress = false;
				Zotero.Integration.currentDoc = Zotero.Integration.currentSession = null;
			}
		});
	});

	/**
	 * D47: Google Docs citations come from Zotero's official connector, which asks
	 * 127.0.0.1:23119 and nothing else. CiteWell's own address stays 23120, so it also
	 * answers on 23119 when that port is free.
	 */
	describe('Zotero connector port', function () {
		it('serves the Docs handshake on 23119 so the official connector reaches CiteWell', async function () {
			// A running Zotero owns 23119; CiteWell must not take it from Zotero.
			if (!Zotero.Server.connectorPort) {
				this.skip();
			}
			assert.equal(Zotero.Server.connectorPort, 23119);

			// The previous test leaves a command chained on a promise that only settles
			// when a /respond arrives; start this one from a settled chain.
			Zotero.HTTPIntegrationClient.sendCommandPromise = Promise.resolve();

			let stub = sinon.stub(Zotero.Integration, 'execCommand');
			try {
				stub.callsFake(() => {
					let app = new Zotero.HTTPIntegrationClient.Application();
					app.getActiveDocument();
				});

				let response = await Zotero.HTTP.request(
					'POST',
					'http://127.0.0.1:23119/connector/document/execCommand',
					{
						headers: {
							"Content-Type": "application/json",
							"X-Zotero-Connector-API-Version": "2"
						},
						body: JSON.stringify({
							command: "addEditCitation",
							docId: "zoteroTestDoc"
						}),
					},
				);

				assert.equal(response.status, 200);
				assert.equal(JSON.parse(response.response).command, 'Application.getActiveDocument');
			}
			finally {
				stub.restore();
				Zotero.HTTPIntegrationClient.inProgress = false;
				Zotero.Integration.currentDoc = Zotero.Integration.currentSession = null;
			}
		});
	});
});
