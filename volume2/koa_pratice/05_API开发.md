API 是纯 IO应用，这是 Node.js 擅长的场景。如果 API 是从异构服务中获得并组装的，那么 API 组装部分使用 Node.js 来编写也是非常合适的。前面讲过的 BFF 和 API Proxy 完全可以体现。

### API 的简单写法

对于 API 相应结果，需要将响应的状态和具体的响应数据进行分离，示例代码如下：

```javascript
{
    "status": {
        "code": 10000,
        "message": "Success"
    },
    "response": {
        ...results...
    }
}
```

这是约定。我们更容易处理 API 调用端，比如统一 iOS、Android、AJAX 调用库的使用方式，提高开发效率。

在语义上想做到更加通俗易懂，可以将 data 和 status 分开：

```javascript
{
    "status": {
        "code": 10000,
        "message": "Success"
    },
    "data": {
        ...results...
    }
}
```

#### koa.res.api

koa.res.api 是一个 Koa 的中间件，要把它挂载到 app 对象中。它被用来实现通用约定。

```javascript
npm i --save koa.res.api
```

```javascript
var Koa = require('koa')
var app = new Koa()
var res_api = require('koa.res.api')

app.use(res_api())
```

使用上分为四种方法：

- 直接返回 API 接口

```javascript
ctx.api(404, err, {
    code: 1,
    msg: 'delete failed'
})
```

- 返回带有状态的 JSON 数据

```javascript
ctx.api(data, {
    code: 1,
    msg: 'delete failed!'
})
```

- 返回 JSON API

```javascript
ctx.api(data)
```

- 异常情况下返回错误结果

```javascript
ctx.api_error(err)
```

### 响应处理

除了前端请求需要做响应处理，使用 Node.js 进行 API 聚合也需要进行响应处理。

**比较常见的是 Lodash 的 _.get 方法**，根据对象路径获取值。如果值是 undefined，则会赋予解析结果以默认值，有效减少异常处理。

```javascript
const _ = require('lodash')
const object = { a : [{ b: { c: 3 } }] }
const c = _.get(object, 'a[0].b.c', 1)
console.log(c)
const d = _.get(object, 'a[0].b.d', 1)
console.log(d)
```

另一种更好的方法是使用 TypeScript。作为一门静态类型语言，提前了类型检查的时机。在 TypeScript 里，接口的作用是为这些类型命名以及为代码定义契约。根据接口信息，我们可以对值所具有的结构进行类型检查。开启 --strictNullChecks 选项会启用新的严格空值检查模式，示例如下：

```typescript
interface User {
    name: string;
    age?: number;
}
    
function printUserInfo(user: User) {
    console.log(`${user.name}, ${user.age.toString()}`)
    // error TS2532: Object is possibly 'undefined'
    console.log(`${user.name}, ${user.age!.toString()}`)
    // Ok, you confirm that you're sure user.age is non-null
	if (user.age != null) {
		console.log(`${user.name}, ${user.age!.toString()}`)
        // => OK, the if-condition checked that user.age is non-null
	}
    
    console.log(user.name + ', ' + user.age!=null ? user.age.toString() : 'age unknown')
    // => Unfortunately TypeScript can't infer that age is non-null here
}
```

### RESTful API

HTTP 就是满足 REST 架构的协议模式。想要深入理解 REST，就要理解 REST 的五个关键词：资源（Resource）、表述（Representation）、状态转移（State Transfer）、统一接口（Uniform Interface）、超文本驱动（Hypertext Driven），在《RESTful Web APIs 中文版》一书中对这五个关键词有详细描述，感兴趣的读者可以查阅。

RESTful 也就是说，一个 URL 应该就是一个资源，用于表示状态的变化，不包含其它任何动作。在 Koa 中，RESTful API 路由写法如下。

```javascript
"use strict"

const router = require('koa-router')()

const $middlewares = require('mount-middlewares')(__dirname)

// 控制器
const $ = require(('mount-controllers')(__dirname).users_controller)

router.get()
router.post()
router.patch()
router.delete()
...

module.exports = router
```

比如获取所有用户的路径就是 ‘/users’，而获取某个用户的路径是 '/users/:id'。可以根据 URL 中的状态转换来获取想要的资源。

除了需要注意 URL 路径，我们还要注意 HTTP 动词的运用。

- POST 创建资源
- PATCH 进行更新
- DELETE 进行删除

按照 REST 的要求，我们必须通过统一的接口来对资源执行各种操作，并且对每个资源只能执行一组有限的操作。HTTP1.1 定义了一个操作资源的统一接口，主要包含以下内容：

- 7 个 HTTP 方法：GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS
- HTTP 头部
- HTTP 响应状态码
- 一套标准的内容协商机制
- 一套标准的缓存机制
- 一套标准的客户端身份认证机制

### API 访问鉴权

如何保证 API 接口的安全？传统的 Web 站点可以通过登录来解决用户鉴权问题，那么 API 接口呢？

在保障 API 接口的安全性上，需要遵守以下原则：

- 有调用者身份
- 请求具有唯一性
- 请求的参数不能被更改
- 请求的有效时间，即 API 对应的令牌（Token）的有效期要长一点

目前流行的接口鉴权的方式有两种： JSON Web Tokens（JWT）、OAuth

OAuth 中包含两个方法：加密生成令牌、解密获取用户信息。在加密的时候，可以把过期时间加进去，如果对安全性要求特别高，可以把过期时间设置得短一些。如果想增加安全性，也可以叠加鉴权。

OAuth 比 JWT 进行鉴权。通过 JWT 的原始 API进行签名和校验的示例如下：

```javascript
const jwt = require('jsonwebtoken')

const secret = '17koa.com'

var token = jwt.sign({
    data: {
        user_id: 100000,
        user_name: 'i5ting',
        user_email: 'i5ting@126.com'
    }
}, secret, { expiresIn: '1h' })

// invalid token - synchronous
try {
    var decoded = jwt.verify(token, secret)
    console.log(decoded)
} catch (err) {
    // err
}

```

- 客户端申请令牌时，使用 jwt.sign 进行签名，并将签名结果返回客户端
- 签名体（payload）会包含用户的必要信息，以便通过 jwt.verify 进行校验时能获得该信息，作为后面的查询依据
- 当 API 请求携带令牌时，需要先使用 jwt.verify 进行校验，成功后才能根据用户信息查询并且返回数据

客户端怎么把令牌传给服务器呢？一种实现方法如下：

```javascript
// 检查 POST 信息，URL 的查询参数、头部信息
const token = ctx.request.body.token || ctx.query.token || ctx.headers['x-access-token']
```

- 如果 POST 请求里携带了令牌信息，则优先获取
- 其次使用查询参数里的令牌
- 最后使用头部信息里的 x-access-token

Koa 中，还有更好用的 koa-jwt 模块，示例如下：

```javascript
const jwt = require('koa-jwt')

router.get('/api', jwt({secret:'shared-secret'}), (ctx, next) => {
    // ctx.router available
})
```

所以 API 开发使用 JWT 进行鉴权

### OAuth 鉴权

OAuth 2.0 的运行步骤如下。

- 用户同意打开客户端以后，客户端要求用户给予授权
- 用户同意给予客户端授权
- 客户端使用上一步获得的授权，向认证服务器申请令牌
- 认证服务器对客户端进行认证以后，确认无误，同意发放令牌
- 客户端使用令牌，向资源服务器申请获取资源
- 资源服务器确认令牌无误，同意向客户端开放资源

其核心在于令牌，然后以令牌作为凭证去获取资源。

**我们可以通过 oauth2-server 模块来完成 OAuth 鉴权过程，几乎不需要修改各端 SDK 就可以使用。**