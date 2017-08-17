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


var auth = function (msg){
 console.log("hey");
   console.log(msg);
};
module.exports = {
  success: success,
  fail: fail,
  auth: auth
};
