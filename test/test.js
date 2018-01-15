var PS = require('../index');
var parsePSOutput = require('../lib/parse-output');
var CP = require('child_process');
var assert = require('assert');
var Path = require('path');
var Sinon = require('sinon');

var serverPath = Path.resolve(__dirname, './node_process_for_test.js');
var UpperCaseArg = '--UPPER_CASE';
var child = null;
var pid = null;

function startProcess() {
  child = CP.fork(serverPath, [UpperCaseArg]);
  pid = child.pid;
}

function killProcess() {
  if (process.kill(pid, 0)) {
    process.kill(pid);
  }
}

var processKill = process.kill;

function mockKill() {
  process.kill = function() {};
}

function restoreKill() {
  process.kill = processKill;
}

describe('test', function () {
  before(function (done) {
    PS.lookup({arguments: 'node_process_for_test'}, function (err, list) {
      var processLen = list.length;
      var killedCount = 0;
      if (processLen) {
        list.forEach(function (item) {
          PS.kill(item.pid, function () {
            killedCount++;
            if (killedCount === processLen) {
              done();
            }
          });
        });
      } else {
        done();
      }
    });
  });

  beforeEach(startProcess);

  describe('#lookup()', function () {

    afterEach(killProcess);

    it('by id', function (done) {
      PS.lookup({pid: pid}, function (err, list) {
        assert.equal(list.length, 1);
        assert.equal(list[0].arguments[0], serverPath);

        done();
      });
    });

    it('by command & arguments', function (done) {
      PS.lookup({command: '.*(node|iojs).*', arguments: 'node_process_for_test'}, function (err, list) {
        assert.equal(list.length, 1);
        assert.equal(list[0].pid, pid);
        assert.equal(list[0].arguments[0], serverPath);
        done();
      });
    });

    it('by arguments, the matching should be case insensitive ', function (done) {
      PS.lookup({arguments: 'UPPER_CASE'}, function (err, list) {
        assert.equal(list.length, 1);
        assert.equal(list[0].pid, pid);
        assert.equal(list[0].arguments[0], serverPath);

        PS.lookup({arguments: 'upper_case'}, function (err, list) {
          assert.equal(list.length, 1);
          assert.equal(list[0].pid, pid);
          assert.equal(list[0].arguments[0], serverPath);
          done();
        });
      });
    });

    it('empty result list should be safe ', function (done) {
      PS.lookup({command: 'NOT_EXIST', psargs: 'l'}, function (err, list) {
        assert.equal(list.length, 0);
        done();
      });
    });

    it('should work correctly with options `aux`', function (done) {
      PS.lookup({command: 'node', psargs: 'aux'}, function (err, list) {
        assert.equal(list.length > 0, true);
        list.forEach(function (row) {
          assert.equal(/^\d+$/.test(row.pid), true);
        });
        done();
      });
    });
  });

  describe('#kill()', function () {

    it('kill', function (done) {
      PS.lookup({pid: pid}, function (err, list) {
        assert.equal(list.length, 1);
        PS.kill(pid, function (err) {
          assert.equal(err, null);
          PS.lookup({pid: pid}, function (err, list) {
            assert.equal(list.length, 0);
            done();
          });
        });
      });
    });

    it('should not throw an exception if the callback is undefined', function (done) {
      assert.doesNotThrow(function () {
        PS.kill(pid);
        PS.kill(pid, function() {
          done();
        });
      });
    });

    it('should force kill when opts.signal is SIGKILL', function (done) {
      PS.lookup({pid: pid}, function (err, list) {
        assert.equal(list.length, 1);
        PS.kill(pid, {signal: 'SIGKILL'}, function (err) {
          assert.equal(err, null);
          PS.lookup({pid: pid}, function (err, list) {
            assert.equal(list.length, 0);
            done();
          });
        });
      });
    });

    it('should throw error when opts.signal is invalid', function (done) {
      PS.lookup({pid: pid}, function (err, list) {
        assert.equal(list.length, 1);
        PS.kill(pid, {signal: 'INVALID'}, function (err) {
          assert.notEqual(err, null);
          PS.kill(pid, function(){
            done();
          });
        });
      });
    });
  });

  describe('#kill() timeout: ', function () {
    it('it should timeout after 30secs by default if the killing is not successful', function(done) {
      mockKill();
      var clock = Sinon.useFakeTimers();
      var killStartDate = Date.now();
      PS.lookup({pid: pid}, function (err, list) {
        assert.equal(list.length, 1);
        PS.kill(pid, function (err) {
          assert.equal(Date.now() - killStartDate >= 30 * 1000, true);
          assert.equal(err.message.indexOf('timeout') >= 0, true);
          restoreKill();
          PS.kill(pid, function(){
            clock.restore();
            done();
          });
        });
        clock.tick(30 * 1000);
      });
    });

    it('it should be able to set option to set the timeout', function(done) {
      mockKill();
      var clock = Sinon.useFakeTimers();
      var killStartDate = Date.now();
      PS.lookup({pid: pid}, function (err, list) {
        assert.equal(list.length, 1);
        PS.kill(pid, { timeout: 5 }, function (err) {
          assert.equal(Date.now() - killStartDate >= 5 * 1000, true);
          assert.equal(err.message.indexOf('timeout') >= 0, true);
          restoreKill();
          PS.kill(pid, function(){
            clock.restore();
            done();
          });
        });
        clock.tick(5 * 1000);
      });
    });
  });

  describe('OSX formatted ps output', function () {
    it('should be parsed correctly', function () {
      var output =
        'F   UID   PID  PPID PRI  NI    VSZ   RSS WCHAN  STAT TTY        TIME COMMAND\n' +
        '4  1000  3002     1  20   0  45248     0 ep_pol Ss   ?          0:00 /lib/systemd/systemd --user\n' +
        '5  1000  3006  3002  20   0 163688     4 -      S    ?          0:00 (sd-pam)\n' +
        '0  1000  3101     1  20   0 9657524 6355656 poll_s Sl ?       1440:57 mysqld --datadir /aa/aa/aa\n' +
        '0  1000  3178     1  20   0 808752 247892 hrtime Sl  ?        11234:03 ./aa -aa /aa/aa/aa/aa.aa -aa /aa/aa/aa/aa/aa/aa/aa -aa /aa/aa/aa/aa/aa/bb/bb.bb.bb.bb -t 4 -bb /cc/cc/cc/cc/cc/cc/cc.cc -cc /a/a/a/a/a/a/a.a\n' +
        '0  1000  3198     1  20   0 639312     0 hrtime Sl   ?          3:54 ./h -d /a/a/a -p 3\n' +
        '0  1000  9215     1  20   0 1879292 95352 ep_pol Sl  ?         47:06 node ./d/d\n' +
        '0  1000 12547     1  20   0 1931424 21016 ep_pol Sl  ?          0:14 node app.js --prod\n' +
        '0  1000 17244     1  20   0 1450676 190724 ep_pol Sl ?        226:10 node app.js --prod --name="My app"\n' +
        '1  1000 17789     1  20   0  79940 44376 -      S    ?         17:43 tor --runasdaemon 1\n' +
        '5  1000 21352 21325  20   0 113860  1236 -      S    ?          0:01 sshd: user@pts/8\n' +
        '0  1000 21353 21352  20   0  22676  3804 wait_w Ss+  pts/8      0:00 -bash\n' +
        '5  1000 21675 21647  20   0 113868  1232 -      S    ?          0:00 sshd: user@pts/9\n' +
        '0  1000 21676 21675  20   0  22788  4748 wait   Ss   pts/9      0:00 -bash\n' +
        '0  1000 21973 21676  20   0 920496 28816 ep_pol Sl+  pts/9      0:00 node\n' +
        '0  1000 21987 21973  20   0  28916  1500 -      R+   pts/9      0:00 ps lx\n';
      var parsedProcesses = parsePSOutput(output);
      assert.deepEqual(parsedProcesses, [
        {
          'pid': '3002',
          'command': '/lib/systemd/systemd',
          'arguments': ['--user'],
          'ppid': '1'
        },
        {
          'pid': '3006',
          'command': '(sd-pam)',
          'arguments': [],
          'ppid': '3002'
        },
        {
          'pid': '3101',
          'command': 'mysqld',
          'arguments': ['--datadir', '/aa/aa/aa'],
          'ppid': '1'
        },
        {
          'pid': '3178',
          'command': './aa',
          'arguments': ['-aa', '/aa/aa/aa/aa.aa', '-aa', '/aa/aa/aa/aa/aa/aa/aa', '-aa', '/aa/aa/aa/aa/aa/bb/bb.bb.bb.bb', '-t', '4', '-bb', '/cc/cc/cc/cc/cc/cc/cc.cc', '-cc', '/a/a/a/a/a/a/a.a'],
          'ppid': '1'
        },
        {
          'pid': '3198',
          'command': './h',
          'arguments': [ '-d', '/a/a/a', '-p', '3'],
          'ppid': '1'
        },
        {
          'pid': '9215',
          'command': 'node',
          'arguments': ['./d/d'],
          'ppid': '1'
        },
        {
          'pid': '12547',
          'command': 'node',
          'arguments': ['app.js', '--prod'],
          'ppid': '1'
        },
        {
          'pid': '17244',
          'command': 'node',
          'arguments': ['app.js', '--prod', '--name="My app"'],
          'ppid': '1'
        },
        {
          'pid': '17789',
          'command': 'tor',
          'arguments': ['--runasdaemon', '1'],
          'ppid': '1'
        },
        {
          'pid': '21352',
          'command': 'sshd:',
          'arguments': ['user@pts/8'],
          'ppid': '21325'
        },
        {
          'pid': '21353',
          'command': '-bash',
          'arguments': [],
          'ppid': '21352'
        },
        {
          'pid': '21675',
          'command': 'sshd:',
          'arguments': ['user@pts/9'],
          'ppid': '21647'
        },
        {
          'pid': '21676',
          'command': '-bash',
          'arguments': [],
          'ppid': '21675'
        },
        {
          'pid': '21973',
          'command': 'node',
          'arguments': [],
          'ppid': '21676'
        },
        {
          'pid': '21987',
          'command': 'ps',
          'arguments': ['lx'],
          'ppid': '21973'
        }
      ]);
    });
  });
});
