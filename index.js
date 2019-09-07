const app = require('express')();
const httpServer = require('http').Server(app);
const socketIo = require('socket.io')(httpServer);
const utf8 = require('utf8');
const SSHClient = require('ssh2').Client;
const localSSHPrivateKey = require('fs').readFileSync('/Users/xueancao/.ssh/id_rsa');
const localSSHPassphrase = null;

function SSHServer(machineConfig, socket) {
    const ssh = new SSHClient();
    let {msgId, ip, username, password} = machineConfig;
    ssh.on('ready', function () {
        console.log('客户端:' + msgId + ',登陆成功->' + username + '@' + ip);
        socket.emit(msgId, '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n');
        ssh.shell(function (err, stream) {
            if (err) {
                return socket.emit(msgId, '\r\n' + err.message + '\r\n');
            }
            socket.on(msgId, function (data) {
                stream.write(data);
            });
            stream.on('data', function (d) {
                socket.emit(msgId, utf8.decode(d.toString('binary')));
            }).on('close', function (val) {
                ssh.end();
            });
        })
    }).on('close', function () {
        console.log('客户端：' + msgId + '登出...\r\n');
        socket.emit(msgId, '\r\n*** SSH CONNECTION CLOSED ***\r\n');
    }).on('error', function (err) {
        console.log(err.message);
        socket.emit(msgId, '\r\n' + err.message + '\r\n');
    }).connect({
        host: ip,
        port: 22,
        username: username,
        password: password,
        privateKey: localSSHPrivateKey,
        passphrase: localSSHPassphrase,
        // 5 秒超时
        readyTimeout: 5000
    });
}

socketIo.on('connection', function (socket) {
    socket.on('SSHServer', function (machineConfig) {
        SSHServer(machineConfig, socket);
    });

    socket.on('disconnect', function () {
        console.log('client disconnect');
    });
});

httpServer.listen(8000, function () {
    console.log('listening on * 8000');
});
