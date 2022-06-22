### Stream

Stream 主要是对 IO 输入输出的抽象

- 可以将一个大型系统拆分成一些很小的部分作为流的一部分，通过将它们任意组装，甚至可以实现高级的流程控制
- 不同部分之间的数据通过管道传递

Nodejs 内置的 Stream 本身是一个抽象接口，Nodejs 很多对象使用了这个接口，例如对 HTTP 服务器发起请求的 request 对象，以及 stdout（标准输出）。和 UNIX 类似，**在 Nodejs 中，流模块的基本操作符是 .pipe，通过它可以直接将上一步的结果作为下一步的输出，这是非常高效的做法，尤其适合 Gulp 等 I/O 密集性操作**

Stream 在 Nodejs 中继承 EventEmitter，并且有多种实现形式

比如 request 支持 Stream，stream 的好处如下：

- Nodejs 中的 I/O 操作是异步的，处理起来非常麻烦，而流式的 I/O 处理更加简单高效
- 基于 Buffer 数据结构进行操作时可以节省内存，适合处理大文件
- 包含事件机制（继承自 EventEmiter），具有更高的效率和更好的扩展性
- 可以通过 pipe 方法轻松地连接流和流之间的处理过程，易于组装

在 Nodejs 中，使用 Stream 是非常简单的，命令如下。

```javascript
const stream = require('stream')
```

Node Stream 有五种流操作类型：

- Readable：可读操作类型，可以产出数据，这些数据可以被传送到其它流中，只需要调用 pipe 方法即可。
- Writeble：可写操作类型，只能流进不能流出
- Duplex：可读可写操作类型
- Transform：转换类型，可以写入数据，然后读出结果
- classic：经典接口，现在不怎么使用了

使用 Stream 时，通过继承实现父类的方法，可以进一步实现具体功能，以 Writebale 为例，常用写法如下：

```javascript
const { Writable } = require('stream')

class MyWritable  extends Writable {
    constructor(options) {
        super(options)
    }
    _write(chunk, encoding, callback) {
        if (chunk.toString().indexOf('a') > 0) {
            callback(new Error('chunk is invalid'))
        } else {
            callback()
        }
    }
}
```

介绍了 Stream 的基本情况后，下面我们将从不同方面详细讲解 Stream

#### 原理

Stream 的精髓在于将上一个的输入作为下一个输出，这和 Linux 里管道的功能是一样的，比如查杀所有 Nodejs 进程的命令如下：

```javascript
ps -ef | grep node | awk '{print $2}' | xargs kill -9
```

要点如下：

- ps -ef：查看进程活动
- grep node：过滤并获得包含 node 在内的所有进程
- awk '{print $2}'：通过 awk 获得包含 node 在内的所有进程号
- xargs kill -9：通过 xargs 反转进程号，并作为 kill -9 的参数

这就是典型的管道机制，将 ps -ef 的输出结果作为 grep node 的输入参数，达到一气呵成的效果

请求传递和过滤是 Web Server 中非常重要的功能，著名的 JavaEE 容器 Tomcat 里的 Serverlet 过滤器、OkHttp 等都是基于责任链模式实现的，Nodejs 中的 Stream 机制也是一样的，可以更好的实现类似功能。

Stream 是通过管道进行操作的，要求输入和输出的内容必须都是流，否则需要通过 through2 这样的模块进行转换。参考 Nodejs 源码，可以发现其实 request 对象和 response 对象其实都是继承自 Stream 的。

```javascript
// request
req => IncomingMessage => Stream.Readable
// response
res => ServerResponse => OutgoingMessage => Stream
```

很明显，HTTP 连接中的 request 对象是可读流（Stream.Readable），而 response 对象是完整的可读可写流（Stream.Duplex）

以下代码是通过 http.request 来请求的接口示例：

```javascript
const http = require('http')

const client = http.request(
    {
    	host: "httpbin.org",
    	path: "/ip"
	},
    function (res) {
        res.setEncoding('utf8')
        var str = ''
        res.on('data', function (chunk) {
            str += chunk
        })
        
        res.on('end', function () {
            console.log(str)
        })
    }                      
)

client.on('error', (e) => {
	console.log('problem with request: ${e.message}')
})

client.end()
```

那么， http.request 又是如何实现的呢？ _http_client.js 中对外暴露的是 ClientRequest，而 ClientReuqest 继承自 OutgoingMessage

```javascript
util.inherits(ClientRequest, OutgoingMessage)
```

前面说过 OutgoingMessage 是继承自 Steam 的，所有的 HTTP 过程都是 IncomingMessage 和 OutgoingMessage 的过程，其对应的就是请求和响应的过程。对于 HTTP 客户端来说，这一点体现得尤为明显，通过 client.end() 开始发起请求，这个请求过程是异步的，所以要不断地拼接获得 chunk，以便获得最终的响应。

#### 文件操作

**大文件的读写时非常麻烦的，依靠普通的读写方法会让内存吃不消。对于这种场景，选择 Stream 作为读写方法是最好的。这也是 HTTP 中广泛采用流式方法处理文件的原因。**

例如：

```javascript
var source = fs.readFileSync('/path/to/souorce', {encoding: 'utf8'})
fs.writeFileSync('/path/to/dest', source)
```

等于：

```javascript
fs.createReadStream('/path/to/source').pipe(fs.createWriteStream('/path/to/dest'))
```

这里 pipe 是用来传递上一个流的输出并将其作为下一个流的输入的链式方法。在 HTTP 请求过程中，也可以将 HTTP 请求和 fs 读写的流结合使用，示例如下：

```javascript
const http = require('http')
const fs = require('fs')

const app = http.createServer((req, res) => {
    fs.readFile(__dirname + '/data.txt', (err, data) => {
        res.end(data)
    })
})

app.listen(3000, function () {
	const PORT = app.address().port
    
    console.log('Server running at http:127.0.0.1:${PORT}/')
})
```

#### 转换模式

Gulp 是 Nodejs 世界里基于 Stream 实现的最著名的流式高效构建工具。无论在用法上还是在执行效率方面几乎都做到了极致，唯一比较麻烦的就是基于流的调试和插件开发。

为了解决这个问题，Sindre Sorhus 开发了 gulp-debug 模块，它可以非常简单地打印出在当前处理过程中使用的文件信息。它的写法基于经典的 gulp 插件的写法，并使用 through2 模块来做转换，代码如下：

```javascript
const through = require('through2')

module.exports = opts => {
...

}
```

through2 将输入流转成了更具可读性的文件信息，并将其作为参数，可以更方便开发者使用，这在我们平常的开发中也是非常实用的。

#### HTTP 代理

前面讲过，请求和响应都是继承自 Steam 的，所以可以直接通过 pipe 方法进行组装。

```javascript
const app = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/echo') {
        req.pipe(res)
    } else {
        res.statusCode = 404
        res.end()
    }
})
```

这个例子没有什么具体意义，只是演示简单的 pipe 用法，下面来看一个简单实用的代理示例

```javascript
const http = require('http')
const fs = require('fs')

const app = http.createServer((req, res) => {
    if ('remote' === req.url) {
        res.writeHead(200, {'Content-Type': 'text/plain'})
        return res.end('Hello Remote Page\n')
    } else {
        proxy(req, res)
    }
})

function proxy (req, res) {
    let options = {
        host: req.host,
        port: 3000,
        headers: req.headers,
        path: '/remote',
        agent: false,
        method: 'GET'
    }
    
    let httpProxy = http.request(options, (response) => {
        response.pipe(res)
    })
    
    req.pipe(httpProxy)
}

app.listen(3000, function() {
	const PORT = app.address().port
    
    console.log('Serverr running at http://127.0.0.1:${PORT}/')
})
```

要点如下：

- 变量 httpProxy 是 http.request() 函数的返回值，是一个新的请求
- 通过 req.pipe(httpProxy) 操作，req 就拥有了新的 res（即 HTTP 代理请求的响应）。也就是说最终返回的是 response
- HTTP 代理完成了一次完整的 HTTP 请求过程，响应交由 res 返回，于是原来的请求相当于穿透了 HTTP 代理的请求和响应

所以 http.request 通过 pipe 得到的返回值和 res 是一样的

说到底，req 和 res还是原来那个，只不过中途被 HTTP 代理拦截了一下，代理是中间人。很多公司的前端开发人员为了避免跨域问题，都会直接通过 Nodejs 透传 HTTP 请求，选择 request 模块或者 axios 模块作为 HTTP 客户端。

可是大家想过没有，明明是透传，除了 host 不一样，其他全都不变，为什么要重复写代码呢？其实，将上面的代码改一下就可以通用了。原则上讲，能够使用 Nodejs SDK 完成的任务，尽量少用第三方模块。