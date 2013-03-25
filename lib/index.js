var ChildProcess = require('child_process');
var IS_WIN = process.platform === 'win32';
var TableParser = require( 'table-parser' );

/**
 * Execute child process
 * @type {Function}
 * @param {String[]} args
 * @param {Function} callback
 * @param {Object=null} callback.err
 * @param {Object[]} callback.stdout
 */

var Exec = module.exports = exports = function( args, callback) {
	if (Array.isArray(args)) {
		args = args.join(' ');
	}

    // windows 下直接通过exec方法来wmic process get没有stdout，因此通过调用CMD的方法来做
    if( IS_WIN ){

        var spawn = ChildProcess.spawn;
        var CMD = spawn('cmd');
        var stdout = [];
        var stderr = null;

        CMD.stdout.on('data', function (data) {
            stdout.push( data.toString() );
        });

        CMD.stderr.on('data', function (data) {

            if( stderr === null ){
                stderr = data.toString();
            }
            else {
                stderr += data.toString();
            }
        });

        CMD.on('exit', function () {

            var beginRow;

            // 寻找到数据的第一行（标题行）
            stdout.forEach(function( out, index ){
                if( typeof beginRow == 'undefined' && out.indexOf( 'CommandLine' ) === 0 ){
                    beginRow = index;
                }
            });

            // 去掉开头和结尾 （开头为CMD的版权等，结尾为当前路径）
            stdout.splice( stdout.length - 1 , 1 );
            stdout.splice( 0 , beginRow );

            // FS.writeFileSync( __dirname + '/log.' + Date.now(), stdout.join(''));

            // 去掉第一行和第二行，分别为System Idle Process 和 System，它们有大量字段丢失，影响结果
            var stdoutTmp = stdout.join( '' ).split( '\n');
            stdoutTmp.splice( 1, 2 );

            callback( stderr, stdoutTmp.join( '\n') || false );
        });

        CMD.stdin.write('wmic process get ProcessId,CommandLine \n');
        CMD.stdin.end();
    }
    else {
        ChildProcess.exec( 'ps ' + args, function( err, stdout, stderr) {

            if (err || stderr) {
                return callback( err || stderr.toString() );
            }
            else {
                stdout = stdout.toString();
                callback(null, stdout || false);
            }
        });
    }
};

/**
 * Query Process: Focus on pid & cmd
 * @param query
 * @param {String|String[]} query.pid
 * @param {String} query.command RegExp String
 * @param {String} query.arguments RegExp String
 * @param {Function} callback
 * @param {Object=null} callback.err
 * @param {Object[]} callback.processList
 * @return {Object}
 */

exports.lookup = function(query, callback) {
    var exeArgs = query.psargs || [];
    var filter = {};
    var idList;

	// Lookup by PID
	if ( query.pid ) {

        if( Array.isArray( query.pid ) ){
            idList = query.pid;
        }
        else {
            idList = [ query.pid ];
        }
	}

    if( query.command ){
        filter[ 'command' ] = new RegExp( query.command );
    }

    if( query.arguments ){
        filter[ 'arguments' ] = new RegExp( query.arguments );
    }

    return Exec( exeArgs, function(err, output) {
        if (err) {
            return callback( err );
        }
        else {
            var processList = parseGrid( output );
            var resultList = [];

            processList.forEach(function( p ){

                var flt;
                var type;
                var result = true;
                // 若限定了id列表
                if( idList && idList.indexOf( String( p.pid ) ) < 0 ){
                    return;
                }

                for( type in filter ){
                    flt = filter[ type ];
                    result = flt.test( p[ type ] ) ? result : false;
                }

                if( result ){
                    resultList.push( p );
                }
            });

            callback( null, resultList );
        }
    });
};

/**
 * Kill process
 * @param pid
 * @param next
 */

exports.kill = function( pid, next ){

    var killCommand = IS_WIN ? 'taskkill ' : 'kill ';
    var command = killCommand + ( IS_WIN ? '/F /PID ' + pid : pid );
    ChildProcess.exec( command, function( err, stdout, stderr) {
        if (err || stderr) {
            return next( err || stderr.toString() );
        }
        else {
            stdout = stdout.toString();

            // 在windows下，kill完马上查询会出现还能找到刚刚被kill的进程的情况，因此等待200ms，然后再认为kill结束
            if( IS_WIN ){
                setTimeout(function(){
                    next( null, stdout );
                }, 200 );
            }
            else {
                next( null, stdout );
            }
        }
    });
};

/**
 * Parse the stdout into readable object.
 * @param {String} output
 */

function parseGrid( output ) {
	if ( !output ) {
        return output;
    }
    return formatOutput( TableParser.parse( output ) );
}

/**
 * 格式化输出结构，从里面提取出 pid, command, arguments
 * @param data
 * @return {Array}
 */

function formatOutput( data ){
    var formatedData = [];
    data.forEach(function( d ){
        var pid = ( d.PID && d.PID[ 0 ] ) || ( d.ProcessId && d.ProcessId[ 0 ] ) || undefined;
        var cmd = d.CMD || d.CommandLine || d.COMMAND || undefined;

        if( pid && cmd ){
            var command = cmd[ 0 ];
            var args = '';

            if( cmd.length > 1 ){
                args = cmd.slice( 1 );
            }

            formatedData.push( {
                pid: pid,
                command: command,
                arguments: args
            });
        }
    });

    return formatedData;
}
