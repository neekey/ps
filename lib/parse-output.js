var split = require('split-string');
var EOL = /(\r\n)|(\n\r)|\n|\r/;

module.exports = parsePSOutput;

/**
 * Parse the stdout into readable object.
 * @param {String} output
 */
function parsePSOutput(output) {
  var lines = (output || '')
    .split(EOL)
    .filter(function(p) {
      return p !== undefined;
    });

  var header = lines[0] || '';
  var fieldNames = splitLine(header);
  var pidIdx = fieldNames.indexOf('PID');
  var ppidIdx = fieldNames.indexOf('PPID');
  var cmdIdx = fieldNames.indexOf('COMMAND');

  return lines
    .slice(1)
    .map(function (line) {
      var fields = splitLine(line);
      var pid = fields[pidIdx];
      var ppid = fields[ppidIdx];
      var cmd = fields[cmdIdx];
      var args = cmdIdx !== -1 ? fields.slice(cmdIdx + 1) : [];
      return {
        pid: pid,
        command: cmd,
        arguments: args,
        ppid: ppid
      };
    })
    .filter(function (proc) {
      return proc.pid && proc.command;
    });
}

function splitLine(line) {
  return split(line, {sep: ' ', brackets: false, keepDoubleQuotes: true, keepSingleQuotes: true}).filter(function (word) {
    return word !== '';
  });
}
