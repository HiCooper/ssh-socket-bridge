var app = require('express')();
var httpServer = require('http').Server(app);
var socketIo = require('socket.io')(httpServer);
var utf8 = require('utf8');
var SSHClient = require('ssh2').Client;
var localSSHPrivateKey = require('fs').readFileSync('/Users/xueancao/.ssh/id_rsa');
var localSSHPassphrase = null;

function SSHServer(machineConfig, socket) {
    var ssh = new SSHClient();
    let { channelId, ip, username, password } = machineConfig;
    ssh.on('ready', function () {
        console.log('客户端:' + channelId + ',登陆成功->' + username + '@'+ ip)
        socket.emit(channelId, '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n');
        ssh.shell(function (err, stream) {
            if (err) {
                return socket.emit(channelId, '\r\n' + err.message + '\r\n');
            }
            socket.on(channelId, function (data) {
                stream.write(data);
            });
            stream.on('data', function (d) {
                socket.emit(channelId, utf8.decode(d.toString('binary')));
            }).on('close', function (val) {
                ssh.end();
            });
        })
    }).on('close', function () {
        console.log('客户端：' + channelId + '登出...\r\n')
        socket.emit(channelId, '\r\n*** SSH CONNECTION CLOSED ***\r\n');
    }).on('error', function (err) {
        console.log(err.message);
        socket.emit(channelId, '\r\n' + err.message + '\r\n');
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
    })

    socket.on('disconnect', function (msg) {
        console.log('client disconnect');
    });
})

httpServer.listen(8000, function () {
    console.log('listening on * 8000');
})