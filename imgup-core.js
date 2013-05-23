;(function(root) {
	'use strict';

	var routes = {
		upload: 'https://api.imgur.com/3/upload'
	};

	function UploadHandler(subscr, xhr) {
		this._subscr = subscr;
		this._xhr = xhr;

		xhr.onload = handlerCallbacks.onload.bind(this);
		xhr.upload.onabort = xhr.onabort =
			xhr.upload.onerror = xhr.onerror = 
				xhr.ontimeout = handlerCallbacks.onerror.bind(this);

		xhr.upload.onprogress = handlerCallbacks.onprogress.bind(this);

		this._progressBacks = [];
		this._errorBacks = [];
		this._thenBacks = [];
	}

	var handlerCallbacks = {
		onload: function() {
			this._subscr();
			this._subscr = null;
			var result = JSON.parse(this._xhr.responseText);

			if (!result.success) {
				handlerCallbacks.onerror.call(this, result);
			} else {
				this._thenBacks.forEach(function(cb) {
					cb(result);
				});
			}
		},

		onprogress: function(e) {
			var completed = e.loaded / e.totalSize;
			this._progressBacks.forEach(function(cb) {
				cb(completed, e);
			});
		},

		onerror: function(e) {
			if (this._subscr != null)
				this._subscr();
			this._errorBacks.forEach(function(cb) {
				cb(e);
			});
		}
	};

	UploadHandler.prototype = {
		cancel: function() {
			this._subscr();
			return this;
		},

		then: function(cb, ecb) {
			if (cb != null)
				this._thenBacks.push(cb);
			if (ecb != null)
				this._errorBacks.push(ecb);

			return this;
		},

		error: function(cb) {
			this._errorBacks.push(cb);

			return this;
		},

		progress: function(cb) {
			this._progressBacks.push(cb);

			return this;
		}
	};

	function Imgup(clientId) {
		this._nextTaskId = 0;
		this.clientId = clientId;

		this._tasks = {};
	}

	Imgup.prototype = {
		upload: function(file) {
			var form = new FormData();
			form.append('image', file);

			var xhr = new XMLHttpRequest();
			xhr.open('POST', routes.upload);
			xhr.setRequestHeader('Authorization', 'Client-ID ' + this.clientId);

			var taskId = this._nextTaskId++;
			var self = this;
			var handler = this._tasks[this._nextTaskId] = new UploadHandler(function() {
				delete self._tasks[taskId];
			}, xhr);

			xhr.send(form);

			return handler;
		}
	};

	root.Imgup = Imgup;
})(this);