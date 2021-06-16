const Koa = require('koa')
const app = new Koa()

app.use(async ctx => {
    return ctx.body = {
        header: ctx.body = {
            header: ctx.header,
            get_cache_control: ctx.get('Cache-Control')
        }
    }
})

app.listen(3001)

console.log("Server running at http://127.0.0.1:3001/");