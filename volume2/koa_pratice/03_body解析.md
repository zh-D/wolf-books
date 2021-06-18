### 依赖模块

处理 body 流的模块非常多，我们以常用的 koa-parser 模块为例，列出和它有依赖关系的模块

| 模块                   | 描述                                                         |
| ---------------------- | ------------------------------------------------------------ |
| koa-bodyparser         | Koa 框架中使用的模块，Koa 中间件，仅处理配置的类型，其他需求交由别的中间件处理 |
| co-body                | koa-bodyparser 的主要依赖模块，主要对 HTTP 里的 req 进行处理 |
| stream-utils、raw-body | 从请求中获取 raw body，是 co-body 的依赖模块                 |

### 原理

在 HTTP 的请求头里，有些 HTTP 动词会带有 message-body，比如 POST、PATCH、DELETE 等。针对使用这些动词的请求，我们需要根据不同的 Content-Type 来返回 body

| 表单提交类型 | Content-Type                                                 | 说明                       |
| ------------ | ------------------------------------------------------------ | -------------------------- |
| JSON 数据    | application/json、application/json-patch+json、application/vnd.api+json、application/csp-report | 使用 RESTful JSON 接口设计 |
| form 表单    | application/x-www-form-urlencoded                            | 常见的表单交互方式         |
| text 文本    | text/plain                                                   | 不常用，特定场景会用       |

Koa 通过 ctx.body 向浏览器写入响应，而 ctx 上用了 body 关键字，所以只能通过 ctx.request.body 来处理请求体

### 常见的 POST

相对于 GET 请求，POST 有两个明显的好处：传输的数据量比 GET 大，具体可以传输多少数据要看 Web 服务器的配置：安全性相对更高，比较不是明文传输。

#### JSON

基于 JSON API 开发的客户端能够充分利用缓存，提升性能，有时甚至完全不需要网络请求。

koa-bodyparser 中的默认配置是启动 JSON 支持，所以只要在请求处理之前添加 koa-bodyparser 这个中间件。

路由定义如下：

```javascript
router.post('post/jsonapi/', () => {
    ctx.body = ctx.request.body
})
```

定义好路由并启动服务器之后就可以进行测试了。此时，在终端里使用 curl 命令进行测试，返回结果如下：

```javascript
curl -i \
-X "POST" "http://127.0.0.1:3000/users/post/jsonapi" \
-H "Content-Type: application/vnd.api+json" \
-d $'{
		"data": {
            "type": "posts",
            "attributes": {
                "message": "My name is Catbug!"
            },
            "relationships": {
                "author": {
                    "data": {"id": 5, "type": "users"}
                }
            }
        }
    }'
```

- 指定了 Content-Type 值
- 发送的数据是 JSON 结构数据

服务器返回的测试结果如下：

```javascript
HTTP/1.1 200 OK
Content-Type: application/json;charset=utf-8
Content-Length: 223
Date: .....
Connection: keep-alive
{
    "data": {
        "type": "posts",
        "attributes": {
            "message": "My name is Catbug!"
         },
         "relationships": {
             "author": {
                 "data": {"id": 5, "type": "users"}
             }
          }
    }
}'

```

在 Node.js 里，有专门的模块支持 JSON API，比如 fortune 模块可以帮助我们制定许多规则，比 Koa 自定义相应的支持要简单。

#### 表单类型

POST 为例，它通常会用于进行 3 种处理：通用表单处理、普通表单处理、文件上传。

**通用表单处理**

指 form-data，主要依赖两个模块：

```javascript
npm install --save koa-bodyparser // 解析 body
npm install --save koa-multer // 文件上传
```

app.js 中启用 bodyparser 的可用类型，这种情况下也支持 form，在一般场景下足够用。当然也可以配置更多的 enableTypes：

```javascript
// 
app.use(bodyparser({
    enableTypes: ['json', 'form']
}))
```

koa-multer 用于文件上传，解析 body 中的流，并将其保存成文件

```javascript
const multer = require('koa-multer')
const upload = multer({dest: 'upload/'})
```

使用 koa-multer 只需要把 upload 的中间件挂载到路由上即可，这里使用 upload.any() 方法，不限制表单字段，具体做法如下：

```javascript
router.post('/post/formdata', upload.any(), (ctx) => {
    console.log(ctx.req.files)
    ctx.body = {
        status: {
            code: 0;
            msg: 'upload success'
        }
        data: {
          body: ctx.req.body,
          files: ctx.req.files
    	}
    }
})
```

**koa-multer 不会处理除了 multipart/form-data 以外的任何表单，更多内容请查看其官方文档**

我们可以使用 Postman 来测试 HTTP 请求

文件上传有两种方式：

- 调用 CDN 的 SDK 将文件直接从前端上传到 CND 上
- 采用常规上传方式，先将文件上传到 Node.js 服务器，再由 Node.js 服务器转存到 CDN
- 二者的区别在于是否需要通过服务器对文件进行定制，如果没有直接采用第一种是很不错的选择

**普通表单**

Centent-Type 是 x-www-form-urlencoded，在这种情况下，在 Koa 里解析请求体非常简单，代码如下。

```javascript
router.post('/post', (ctx, next) => {
    console.log(ctx.request.body)
    ctx.body = ctx.request.body
})
```

jQuery 提交普通表单：

```javascript
&(function() {
    &.ajaxSetup({
        contentType: "application/x-www-form-urlencoded; charset=utf-8"
    })
    
    $.post("/users/post", { name: "i5a6", item: "2pm" },
       function(data) {
        console.log(data)
       },
       "json"
    )
})
```

**文件上传**

Koa 的 koa-multer 中间件

```javascript
const router = require('koa-router')()
const multer = require('koa-multer')
const upload = multer({ dest: 'upload/' })

router.prefix('/upload')

router.post('/', upload.any(), (ctx) => {
    ctx.body = {
        status: {
            code: 0,
            msg: 'upload success'
        },
        data: {
            body: ctx.req.files
        }
    }
})

module.exports = router
```

- 先要 npm install
- 需要将 multer 的上传目录配置为根目录下面的 uploads 目录
- upload 变量上传的函数有 array、singgle、fields 等，这些函数均可以用来处理文件上传
- multer 的原始做法是通过 ctx.req.files 来获取上传的文件，然后对 API 进行调整

curl 测试

```javascript
curl -F 'avatar=@"test.png" -F 'a=1' -F 'b=2' http://127.0.0.1:3000/upload/ '
```

和 ctx.req.files 类似，如果我们想获取表单里的其他内容，可以通过 ctx.reqw.body

#### 文本类型

koa-bodyparser 默认只支持 form 和 JSON 两种格式的解析，当出现 Content-Type："text/plain" 的时候是无法进行处理的，所以这时需要在 koa-bodyparser 中开启 text 支持。

```javascript
app.use(bodyparser({
    enableTypes: { 'json', 'form', 'text' }
}))
```

接着我们在 routes/user.js 里写一个 /post/raw 路由，其用法和普通表单解析请求体的用法一样，通过 ctx.request.body 来访问请求体，代码如下：

```javascript
router.post('/post/raw', (ctx, next) => {
    ctx.body = ctx.request.body
})
```

