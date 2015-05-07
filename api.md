API tabManager
=============

Methods
--------
- ```tabManager.connect();```
- ```tabManager.connect(tabName);```
- ```tabManager.close();```
- ```tabManager.send('myevent', data);```
- ```tabManager.send('myevent', data, tabName);```
- ```tabManager.createTab(url);```
- ```tabManager.closeTab(tabName);```
- ```tabManager.focusTab(tabName);```
- ```tabManager.on('myevent', callback);```
- ```tabManager.off('myevent', callback);```
- ```tabManager.off('myevent');```

Events
------
- When your tab is connected ```tabManager.on('connect', function(tabName){});```
- When your tab is disconnected ```tabManager.on('close', function(){});```
- When your tab is the main one ```tabManager.on('leadership', function(){});```
- When a tab just connect ```tabManager.on('join', function(tabName){});```
- When a tab just closed ```tabManager.on('leave', function(tabName){});```


Defining Events
---------------
```
// tab 1
tabManager.connect();
tabManager.send('customevent', data);

// tab 2
tabManager.connect();
tabManager.on('customevent', function(data){
	console.log(data);
});
```

Sending message just to one tab
-------------------------------
```
tabManager.connect();
tabManager.send('join', function(tabName) {
	tabManager.send('helloworld', 'Welcome you !', tabName);
});
```

Do an action in one tab for every tabs
```
tabManager.connect();
tabManager.on('leadership', function(){
	_ws = new WebSocket(config.url)
	_ws.onmessage = function(event) {
		tabManager.send(event.data.type, event.data.data, event.data.data.to);
	};
});
tabManager.on('sendToSocket', function(data){
	_ws.postMessage(data);
});
```

CONS
-----
- If we reload the page, we can't focus/close the other tabs (but we can still talk to them).
- Can't close the main (parent) page.