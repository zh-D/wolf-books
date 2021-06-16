var router = koa_router()

// 控制器
var $ = $controllers.books_controller;

/**
 * Auto generate RESTful url routes
 * 
 * URL routes:
 * 
 * GET /book[/] => book.list()
 * GET /books/new => book.new()
 * GET /books/:id => book.show()
 * GET /books/:id/edit => book.edit()
 * POST /books[/] book.create()
 * PATCH /books/:id => book.update()
 * DELETE /books/:id => book.destroy()
 */

 router.get('/new', $.new)

 router.get('/:id/edit', $.edit)

 router.get('/', $.list)

 router.post('/', $.create)

 router.get('/:id', $.show)

 router.patch('/:id', $.update)

 router.delete('/:id', $.destroy)

 // -- custom routes
 module.exports = router;