# Audio Trip OBS Overlay

Some work-in progress on an OBS overlay to display the Play Status 
for the VR Game Audio Trip.

Not even close to done. Just me, doodling around and trying to work with
WebSocket API because I want to.

Look at src/basic-test/index.html for a very basic example of a client.

There are two test-servers for this in the folders src/test-server and 
src/proxy-server.

Run them using

```
npm test
```

for the test-server or

```
npm run proxy
```

for the proxy-server.

You may want to read the comment at the start of the servers before you run
any of them.

Before any of that works (except for the index.html), you'll need to run

```
npm install
```

DON'T BLAME ME IF YOU USE THIS FOR ANYTHING, ESPECIALLY IF IT EATS YOUR 
HOMEWORK. BECAUSE IT PROBABLY WILL.

But feel free to send PRs for bug fixes. Thanks :)
