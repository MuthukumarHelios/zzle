// contains the function which thorws exception

function success(res, message) {
  obj = {};
   obj.error = false;
   obj.message = message;
   return res.json(obj);
};
function fail(res, message){
  obj = {};
   obj.error = true;
   obj.message = message;
   return res.json(obj);
};
var jwt = require('jsonwebtoken');
var authenticate = function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token =  req.headers["access-token"];
  // decode token
  if (token !== undefined) {
    // verifies secret and checks exp
    jwt.verify(token, 'secret', function(err, decoded) {
      if (err) {
        return res.json({ error: true, message: 'Failed to authenticate token.' });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(403).send({
      error: true,
      message: 'No token provided.'
    });
  }
};

module.exports = {
  success: success,
  fail: fail,
  authenticate:authenticate
};
