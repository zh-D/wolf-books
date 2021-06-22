所有的 Stream 对象都是 EventEmitter 的实例，而请求和响应都是 Stream 对象，所以它们也是 EventEmitter 的实例，并且继承了 Stream 和 EventEmitter 中的事件。

- data：当有数据可读时触发
- end：当没有更多的数据可读时触发
- error：接收和写入过程中发生错误时触发
- finish：所有数据已被写入底层系统时触发

### 请求事件

请求事件有一个非常典型的例子，即保存请求向服务器传递过去的表单数据。这时我们可以使用 req.on('data', cb) 事件，示例如下：

```javascript
const http = require('http')

const app = http.createServer((req, res) => {
    console.log(req)
    if (req.method === 'POST' && req.url === '/echo') {
        var body = []
        req.on('data', function(chunk) {
            body.push(chunk)
        }).on('end', function() {
            body = Buffer.concat(body).toString()
            res.end(body)
        })
    } else {
        res.statusCode = 404
        res.end()
    }
})

app.listen(3002, () => console.log('Server running at http://127.0.0.1:${app.address().port}/'))
```

通过 curl 发送 POST 请求，参数和响应结果都是 a = 1，如下：

```javascript
curl -d "a=1" http://127.0.0.1:3002/echo
```

### 响应事件

http.ServerResponse 继承自 EventEmitter，而不是 Writable Stream。其支持的事件不多，包括 close、finish、error 等。HTTP 本身是无状态的，一次请求只需要一次响应，所以响应后请求就会被销毁。这里以 error 事件为例进行讲解，示例如下：

```javascript
const http = require('http')

const app = http.createServer(function (req, res) {
    req.on('error', function(err) {
        console.log(err)
        res.statusCode = 400
        res.end()
    })
    
    res.on('error', function(err) {
        console.log(err)
    })
    
    if (req.method === 'GET' && req.url === '/echo') {
        req.pipe(res)
    } else {
        res.statusCode = 404
        res.end()
    }
})


app.listen(3000, () => {
    const PORT = app.address().port
    
    console.log('Server running at http://127.0.0.1:${PORT}/')
})
```

当遇到不报错又存在问题的时候，可以想一想是不是有 error 一类的事件没有处理。

### http.Server 事件

以 request 事件为例来看一下写法，request 事件是用来拦截经过服务器处理的所有请求响应信息的，如果想记录或拦截请求信息，可以采用如下方式。

```javascript
const http = require('http')

const app = http.createServer(function(req, res) {
    console.log(`${req.method} ${req.url}`)
    res.writeHead(200, {'Content-Type': 'text/plain'})
    
    res.end('Hello Node.js\n')
})

app.on('request', function(request, response) {
    // request 事件处理
})

app.listen(3000, () => {
    const PORT = app.address().port
    
    console.log('Server running at http://127.0.0.1:${PORT}/')
})
```

看一下 Nodejs 源码中和 HTTP 相关的文件：

```
ls -a lib| grep http
```

exports 方法对外导出的内容有 Agent、globalAgent、ServerResponse、createResponse、createServer、request、get 等，这些都是 http 模块对外暴露的 API。相信大家都已经见过，比如 http.request 方法用于发送通用的 HTTP 请求。

对于 Nodejs 里 C 和 C++ 相关的代码，可以不进行深入了解，明白原理即可。但对于 Nodejs 源码里的 JavaScript 代码还是建议大家深入了解，因为这些代码与开发息息相关，至关重要。