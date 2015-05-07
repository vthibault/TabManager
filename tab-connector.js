(function(global) {
	'use strict';


	/**
	 * @var {Array} client list
	 */
	var _clients = [];


	/**
	 * @var {number} Timeout interval to remove freezed/closed window from list
	 */
	var TIMEOUT = 5000;


	/**
	 * Get empty slot
	 * @return {number} slot index
	 */
	function getFreeSlot() {
		var i, count;

		for (i = 0, count = _clients.length; i < count; ++i) {
			if (!_clients[i]) {
				return i;
			}
		}

		return i;
	}


	/**
	 * Check if we have client
	 * @return {boolean} has client
	 */
	function getClientCount() {
		var i, count, total = 0;

		for (i = 0, count = _clients.length; i < count; ++i) {
			if (_clients[i]) {
				total++;
			}
		}

		return total;
	}


	/**
	 * Detect if the main tab is closed, if it's the case then
	 * attribute the role to a new tab
	 */
	function selectNewMainTab() {
		var i, selection, count, tab;

		for (i = 0, selection = -1, count = _clients.length; i < count; ++i) {
			if (_clients[i]) {
				// Already have a main tab
				if (_clients[i].isMaster) {
					return;
				}

				if (selection < 0) {
					selection = i;
				}
			}
		}

		tab = _clients[selection];
		tab.isMaster = true;
		tab.postMessage({
			type: 'leadership'
		});
	}


	/**
	 * Get the main tab
	 */
	function getMainTab() {
		var i, count;

		for (i = 0, count = _clients.length; i < count; ++i) {
			if (_clients[i] && _clients[i].isMaster) {
				return _clients[i];
			}
		}

		return null;
	}


	/**
	 * Generate an unique name
	 * @param {string} base name
	 * @return {string}
	 */
	function generateUID(name) {
		var i, count;
		var num = 1;

		name = name || 'unknown';

		for (i = 0, count = _clients.length; i < count; ++i) {
			if (_clients[i] && _clients[i].uid === name || name === 'main') {

				for (i = 0; i < count; ++i) {
					if (_clients[i] && _clients[i].uid === name + num) {
						num++;
						i = -1;
					}
				}

				return name + num;
			}
		}

		return name;
	}


	/**
	 * Generic message handler
	 * @param {number} slot id
	 */
	function genericMessageHandler(id) {
		return function onMessage(event) {
			if (!_clients[id]) {
				return;
			}

			switch (event.data.type) {
				case '__pong':
					_clients[id].tick = Date.now();
					break;

				case '__disconnect':
					onDisconnect(id);
					break;

				case '__registerid':
					onRegister(id, event.data.data);
					break;

				default:
					if (event.data.to === '*') {
						broadCastExcept( id, event.data);
					} else {
						sendTo(event.data.to, event.data);
					}
					break;
			}
		};
	}


	/**
	 * Broadcast to every one except...
	 * @param {number} id (slot)
	 * @param {object} data to send
	 */
	function broadCastExcept(id, data) {
		var i, count;

		for (i = 0, count = _clients.length; i < count; ++i) {
			if (i !== id && _clients[i]) {
				_clients[i].postMessage(data);
			}
		}
	}


	/**
	 * Send data to a tab
	 * @param {string} port name
	 * @param {object} data to send
	 */
	function sendTo(name, data) {
		var i, count;

		// "main" is a reserved alias to call the master tab
		if (name === 'main') {
			getMainTab().postMessage(data);
			return;
		}

		for (i = 0, count = _clients.length; i < count; ++i) {
			if (_clients[i] && _clients[i].uid === name) {
				_clients[i].postMessage(data);
				return;
			}
		}
	}


	/**
	 * Handle connection
	 * @param {object} event
	 */
	function onConnect(event) {
		var port, id;

		port         = event.source;
		port.tick    = Date.now();
		id           = getFreeSlot();
		_clients[id] = port;

		port.addEventListener('message', genericMessageHandler(id), false);
		port.start();
	}


	/**
	 * Disconnect a client
	 * @param {number} id
	 */
	function onDisconnect( id ) {
		var client   = _clients[id];
		var isMaster = client.isMaster;

		broadCastExcept( id, {
			type: 'leave',
			data: client.uid
		});

		delete _clients[id];

		if (isMaster) {
			selectNewMainTab();
		}
	}


	/**
	 * Register a client
	 * @param {number} id
	 * @param {string} tab defined name
	 */
	function onRegister( id, name ) {
		var i, count;
		var client;

		client          = _clients[id];
		client.uid      = generateUID(name);
		client.isMaster = getClientCount() === 1;

		// Trigger connect event
		client.postMessage({
			type: 'connect',
			data: client.uid
		});

		// Trigger leadership event
		if (client.isMaster) {
			client.postMessage({
				type: 'leadership'
			});
		}

		// Send list of availables windows
		for (i = 0, count = _clients.length; i < count; ++i) {
			if (i !== id && _clients[i]) {
				client.postMessage({
					type: 'join',
					data: _clients[i].uid
				});
			}
		}

		// Notice other windows
		broadCastExcept( id, {
			type: 'join',
			data: client.uid
		});
	}


	/**
	 * Ping to disconnect tabs on timeout
	 */
	function onCheckTimeout() {
		var i, count, now, hasLeader;

		now       = Date.now();
		count     = _clients.length;
		hasLeader = true;

		for (i = 0; i < count; ++i) {
			if (!_clients[i]) {
				continue;
			}

			// Timeout, disconnect it
			if (_clients[i].tick + TIMEOUT + 200 < now) {
				broadCastExcept( i, { type: 'leave', data: _clients[i].uid });
				_clients[i].postMessage({ type: 'close' });

				hasLeader   = hasLeader && _clients[i].isMaster;
				_clients[i] = undefined;
				continue;
			}

			_clients[i].postMessage({ type: '__ping' });
		}

		if (!hasLeader) {
			selectNewMainTab();
		}
	}

	// Register events, start ping
	global.addEventListener('connect', onConnect, false);
	setInterval( onCheckTimeout, TIMEOUT);
})(this);