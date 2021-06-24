### HTTPS 是什么

略

### 生成证书

对于真正的线上应用，生成证书的方式通常有两种：

- Let's Encrypt：优点很多，免费、快捷、支持多域名、三条命令即可签署+导出证书。缺点是生成证书只有三个月的有效期，到期需续签
- 商用方式：选择非常多，不同机构的受信级别也是有差异的

这里以 Let's Encrtypt 为例介绍如果生成 HTTPS 证书。首先我们要安装 acme.hs 脚本。

```javascript
curl https://get.acme.sh | sh
```

把 acme.sh 安装到 home 目录下：

```c
~/ .acme.sh/
```

创建一个 bash 的 alias，方便使用：

```javascript
acme.sh=~/ .acme.sh/acme.sh
```

完成以上步骤，我们便获得了 cronjob 定时任务，每天 0:00 可以自动检测所有证书。如果快过期了需要更新，则会自动更新证书。安装过程不会污染已有系统的任何功能文件，所有的修改都限制在安装目录（~/.acme.sh./）中。

### 验证和自动续约

验证 HTTPS 是否生效的最简单方式是通过 DNS 模式进行验证，acme.sh 里已经提供了该功能，在终端里可直接使用。

```javascript
acme.sh --issue --dns -d www.xxx.com
```

在 name.com 上，给域名添加一个 TXT 解析规则，重新验证后，待刚才的域名生效后，执行如下命令：

```
acme.sh --renew -d www.xxx.com
```

执行后，会有生成 cert 文件成功的提示。生成的目录一般在 ~/acme.sh/www.xxx.com 下。有了公钥和证书文件，我们就可以配置 Nginx SSL 了。

你可以编写脚本让 Let's Encrypt 申请的证书自动续约。

### Nodejs 服务器 HTTPS 配置

我们给 Nodejs Web 应用加上 HTTPS 证书

```javascript
const https = require('https')
const fs = require('fs')

const hskey = fs.readFileSync('www.i5ting.com/www.i5ting.com.key')
const hscert = fs.readFileSync('www.i5ting.com/fullchain.cer')

const options = {
    key: hskey,
    cert: hscert
}

https.createServer(options, function (req, res) {
    res.writeHead(200)
    res.end("Hi form HTTPS")
}).listen(8000)
```

在终端访问，如果出现 HTTPS 和 安全，说明浏览器认同该证书。

配置好以后，我们可以在 ssllabs 网站上检查 HTTPS 的安全级别。

HSTS（HTTP Strict Transport Security），国际互联网工程任务组正在维护一种新型的 Web 安全协议，作用是强制客户端（如浏览器）使用 HTTPS 与服务器创建连接。在 Nodejs 中，这些操作都可以通过 helmet 模块轻松完成。

```javascript
var helmet = requires('helmet')
...
app.use(helmet.hsts({
    maxAge: 31536000000,
    includeSubdomains: true,
    force: true
}))
```

helmet 是非常实用的 Nodejs 安全模块，可以轻松加固一些与安全性相关的 HTTP 头

- Strict-Tramsport-Security：强制使用安全连接将客户端与服务器端连接
- X-Frame-Options：对”点击劫持提供保护“
- X-XSS-Protection：开启大多现代浏览器内建的对于 XSS 的过滤功能
- X-Content-Type-Options：防止浏览器使用 MIME-sniffing 来确定响应类型，而让浏览器使用明确的 Content-Type 来确定。
- Content-Security-Policy：防止受到跨站脚本攻击以及其他跨站注入攻击

### Nginx HTTPS 配置

在实际使用中，Nginx 和 Nodejs Web 应用搭配使用是非常常见的。这里给出 Nginx HTTPS 的配置方法。

首先保证 Ngnix 的 HTTPS 配置正常，生成 Diffie-Hellman Group（可选），命令如下：

```javascript
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

修改 Ngnix 配置，代码如下：

```javascript
server {
    listen 443 ssl;
    server_name www.i5ting.com;
}

ssl_certificate    /Users/sang/.acme.sh/www.i5ting.com/fullchain.cer
ssl_certificate_key    /Users/sang/.acme.sh/www.i5ting.com/www.i5ting.com.key

{your config...}
```

启用更安全的 SSL 协议及 Ciphers，代码如下：

略

重定向非 HTTPS 请求：

略

通过命令重载 Nginx，先测试状态，测试通过后再执行重载操作，具体如下

略

对于上一步，更好的做法是使用 HSTS 协议，代码如下

略

### Nginx HTTPS 反向代理配置

部署绝大多数 Nodejs 应用时，我们都会选择在 Nodejs Server 之前加一层 Nginx，不是因为 Nodejs 无法进行反向代理，而是因为使用 Nginx 从架构层面上更加合理。

Nginx 在集群、容错、负载、反向代理、日志、健康检查等方面都表现得非常优秀，时非常好的选择。

目前一些云平台也都用 Nginx 做负载，比如阿里云的 SLB 时基于 Tengine 的。

下面演示一个功能，将 http://127.0.0.1:3000 转化为 https://www.i5ting.com

Nginx 可以通过 include 和 -c 这两种指定配置文件的方式来启动。为了便于演示，这里采用 -c 指定配置文件的方式，让我们来看一下 Nginx 配置文件的内容。

```javascript
# node nobody
worker_processes 1;

events {
    worker_connections 1024
}

http {
    
}
```

以上代码中的 http 部分是需要具体配置的，里面配置了两个 server 块。

第一个 server 块配置与 HTTP 相关的内容，并强制把所有请求重写到 https 域名下，这样我们只要关心 HTTPS 配置并将请求反向代理到 Nodejs 服务器即可。

```javascript
server {
    listen 80;
    server_name www.xxx.com;
    return 301 https://$host$request_url;
    location / {
        rewrite ^(.*) https://www.xxx.com$1 permanent;
    }
}
```

第二个 server 块配置 HTTPS 相关内容，并把所有请求都反向代理到名为 nodejs 的 server 块上

代码略

上面的配置过程涉及以下三点：

- 在配置中指定 upstream：这里针对的是单台机器的配置，如果针对的是多台机器就变成集群了
- 配置 HTTPS：这里主要是指定了 ssl_certificate 和 ssl_certificate_key 的内容
- 通过配置 proxy_pass 将请求代理到 upstream 的对于服务器上，实现反向代理

接下来，执行如下脚本启动

```javascript
ps -ef|grep nginx| awk '{print $2}'|xargs sudo kill -9
sudo nginx -c /Users/sang/workspace/github/book-source/http/https2/comf.nginx-proxy.conf
node app.js
```

启动 nginx 需要三步

- 确保 nginx 启动
- 通过指定配置的方式启动 nginx
- 启动 nodejs 的 HTTP 服务器

此时访问 https://www.i5ting.com 也会将请求代理到基于 Nodejs 编写的服务器上。http 会被强制重定向到 https

除了 Nginx，HAProxy 也是非常常用的反向代理，另外通过 HAProxy 进行 socket 负载均衡配置也非常方便。