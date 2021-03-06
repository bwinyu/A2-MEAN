// Used session tutorial: https://stormpath.com/blog/everything-you-ever-wanted-to-know-about-node-dot-js-sessions/

var mongoose = require('mongoose');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('client-sessions');
var app = express();
var port = 23423;
var router = express.Router();
var employee = require('./models/employees.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

// Static routes
app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/lib/js'));
app.use(express.static(__dirname + '/bower_components'));

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
        employee.findOne({ username: req.session.user.username }, function(err, user) {
            if (user) {
                req.user = user;
                delete req.user.password; // delete the password from the session
                req.session.user = user;  //refresh the session value
                res.locals.user = user;
            }
            // finishing processing the middleware and run the route
            next();
        });
    } else {
        next();
    }
});

function requireLogin (req, res, next) {
   // console.log("requireLogin");
    if (!req.session.user) {
        // console.log('SESSIONS:' ,req.session);
        res.redirect('/');

    } else {
        next();
    }
}
 

mongoose.connect('mongodb://localhost/assign2');

app.use(session({
    cookieName: 'session',
    secret: 'sdaeacwcsdcwesdc',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: false,
    cookie: {
        httpOnly: false
    }
}));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, PUT, DELETE, PUSH");
    next();
});

// ----------- API ROUTES -------------
// Route for API about/how to use page
app.get('/api/', function(req, res){
    res.redirect('http://www.github.com/abcd134/A2-MEAN/wiki/API');
});

router.route('/employees')
    .get( function(req, res) {
        employee.find({}, function (err, data){
            res.json(data)
        });
    });

router.route('/employees/:employeeID')
    .get(function(req, res) {
        employee.find({id: req.params.employeeID}, function (err, data){
            res.json(data)
        });
    });

// To-do routes
// Get to-do' by the  employee's ID
router.route('/todo/:employeeID')
    .get(function(req, res) { // Get all 'todo's for a single employee

        employee.findOne({id: req.params.employeeID}, 'todo', function (err, data) {
            res.json(data);
        });
    })
    .post(function(req,res){


        employee.findOne({id: req.params.employeeID}, function(error, data){ //Query to get next ID in tod-o
            var newid = data.todo[data.todo.length -1].id + 1; //

            var todoItem = {
                id: newid,
                status: req.body.status,
                priority:req.body.priority,
                date:req.body.date,
                description: req.body.description
            };

            employee.update( // Query to insert new to-do object
                {id: req.params.employeeID},
                {$addToSet: {todo: todoItem}}, {upsert: true},
                function (err, model) {
                    if (err) {
                        console.log(err)
                    }
                    else {
                        res.json(model)
                    }
                }
            );
        });
    });


router.route('/todo/:employeeID/:todoID')
    // Get specific to-do item for an employee
    // Right now it filters the to-do programatically, but I would have liked to do it at DB level
    .get(function(req,res) {
        employee.findOne({id: req.params.employeeID}, function(error, data){

            for(var i = 0; i < data.todo.length; i++){
                if(data.todo[i].id == req.params.todoID){
                    res.json(data.todo[i]);
                }
            }
        });
    })
    // Update to-do item
    .put(function(req,res){
        employee.update({id: req.params.employeeID,'todo.id': req.params.todoID},
            {'todo.$.status': req.body.status,
                'todo.$.priority': req.body.priority,
                'todo.$.date': req.body.date,
                'todo.$.description': req.body.description},
            function (err, data){

                res.json(data);

            });
    })
    // Delete specific to-do item for an employee
    .delete(function(req,res){
        employee.update({id: req.params.employeeID},
            {$pull: {todo: {id: req.params.todoID}}},
            function(err, result){
                res.json(result);
            });
    });


// Messages Routes
router.route('/messages/:employeeID')
    .get(function(req, res) { // Get all messages's for a single employee
        employee.findOne({id: req.params.employeeID}, 'messages', function (err, data){
            res.json(data);
        });
    });

router.route('/messages/:employeeID/:messageID')
    // Get specific message item for an employee
    // Right now it filters the messages programatically, but I would have liked to do it at DB level
    .get(function(req,res) {
        employee.findOne({id: req.params.employeeID}, function(error, data){
            var messages;
            for(var i = 0; i < data.messages.length; i++){
                if(data.messages[i].id == req.params.messageID){
                    res.json(data.messages[i]);
                }
            }
        });
    });

// all paths on router will have /api/ added to their route
app.use('/api', router);


// --------- APPLICATION ROUTES ---------
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
})
    .post('/login', function(req, res) {
        employee.findOne({ username: req.body.username }, {id: 1, username: 1, password: 1}, function(err, user) {
            if (!user) {
                res.json('error');
            } else {
                if (req.body.password === user.password) {
                    // sets a cookie with the user's info
                    req.session.user = user;
                    delete req.session.user.password;
                    res.json(req.session.user);
                } else {
                    res.json('error');
                }
            }
        });
});

app.get('/loggedin', function (req, res) {
    if (req.session.user) {
        res.json ('yes');
    } else {
        res.json ('no');
    }
});

app.get('/logout', function(req, res) {
    req.session.reset();
    res.redirect('/');
});


app.listen(port, function(){ console.log('API running on port: ' + port);});