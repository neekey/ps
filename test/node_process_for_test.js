var now = Date.now();
setTimeout(function () {
  var interval = Date.now() - now;
  console.log('Timer finished, time consuming: ' + interval);
}, 1000000);
