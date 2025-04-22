/**
 * Module dependencies.
 */

// mongoose setup
require('./mongoose-db');
require('./typeorm-db')

var st = require('st');
var crypto = require('crypto');
var express = require('express');
var http = require('http');
var path = require('path');
var ejsEngine = require('ejs-locals');
var bodyParser = require('body-parser');
var session = require('express-session')
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var optional = require('optional');
var marked = require('marked');
var fileUpload = require('express-fileupload');
var dust = require('dustjs-linkedin');
var dustHelpers = require('dustjs-helpers');
var cons = require('consolidate');
const hbs = require('hbs')

var app = express();
var routes = require('./routes');
var routesUsers = require('./routes/users.js')

// all environments
app.set('port', process.env.PORT || 3001);
app.engine('ejs', ejsEngine);
app.engine('dust', cons.dust);
app.engine('hbs', hbs.__express);
cons.dust.helpers = dustHelpers;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(methodOverride());
app.use(session({
  secret: 'keyboard cat',
  name: 'connect.sid',
  cookie: { path: '/' }
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

// Routes
app.use(routes.current_user);
app.get('/', routes.index);
app.get('/login', routes.login);
app.post('/login', routes.loginHandler);
app.get('/admin', routes.isLoggedIn, routes.admin);
app.get('/account_details', routes.isLoggedIn, routes.get_account_details);
app.post('/account_details', routes.isLoggedIn, routes.save_account_details);
app.get('/logout', routes.logout);
app.post('/create', routes.create);
app.get('/destroy/:id', routes.destroy);
app.get('/edit/:id', routes.edit);
app.post('/update/:id', routes.update);
app.post('/import', routes.import);
app.get('/about_new', routes.about_new);
app.get('/chat', routes.chat.get);
app.put('/chat', routes.chat.add);
app.delete('/chat', routes.chat.delete);
app.use('/users', routesUsers)

// Static
app.use(st({ path: './public', url: '/public' }));

// Add the option to output (sanitized!) markdown
marked.setOptions({ sanitize: true });
app.locals.marked = marked;

// development only
if (app.get('env') == 'development') {
  app.use(errorHandler());
}

var token = 'SECRET_TOKEN_f8ed84e8f41e4146403dd4a6bbcea5e418d23a9';
console.log('token: ' + token);

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

// Example of a vulnerable Express.js application with MongoDB
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
let usersCollection;

async function connectDB() {
  try {
    await client.connect();
    const database = client.db("userdb");
    usersCollection = database.collection("users");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
}
connectDB();

// VULNERABLE ENDPOINT - User login with NoSQL injection vulnerability
app.post('/api/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  
  // VULNERABLE: Direct use of user input in query without sanitization
  try {
    const query = { 
      username: username,
      password: password 
    };
    
    const user = await usersCollection.findOne(query);
    
    if (user) {
      // User authenticated
      res.status(200).json({ 
        success: true, 
        message: "Login successful",
        user: { 
          id: user._id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      // Authentication failed
      res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// VULNERABLE ENDPOINT - User search with NoSQL injection vulnerability
app.get('/api/users', async (req, res) => {
  const searchQuery = req.query.q || '';
  
  // VULNERABLE: Using string concatenation to build query
  try {
    // This is intentionally vulnerable - using eval-like approach with a string
    const queryObj = eval('({ username: { $regex: "' + searchQuery + '", $options: "i" } })');
    
    const users = await usersCollection.find(queryObj).toArray();
    res.json(users);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// VULNERABLE ENDPOINT - Delete user with NoSQL injection vulnerability
app.delete('/api/users', async (req, res) => {
  // VULNERABLE: Directly using user input object without validation
  const filterCriteria = req.body.filter;
  
  try {
    const result = await usersCollection.deleteMany(filterCriteria);
    
    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Delete users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});