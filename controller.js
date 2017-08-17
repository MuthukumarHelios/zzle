console.log("controller.js");
var router = require('express').Router();
var mysql = require('mysql');

var func = require("./function.js");

var pool = mysql.createPool({
  host            : 'localhost',
  user            : 'root',
  password        : 'root',
  database        : 'zzle_dev'
});
var mysql_settings = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'zzle_dev'
};
var randomstring = require("randomstring");
var qb = require('node-querybuilder').QueryBuilder(mysql_settings, 'mysql');
var pool = require('node-querybuilder').QueryBuilder(mysql_settings, 'mysql', 'pool');
var sha512 = require('sha512');
router.post("/signup", (req, res) => {
var salt = randomstring.generate(5),
    hash_with_key = sha512.hmac(salt),
    password = hash_with_key.finalize(req.body.password),
    ip = req.ip.split(':');
var dbdata = {
          firstName   :req.body.firstName,
          lastName    :req.body.lastName,
          email       :req.body.email,
          password    :password.toString('hex'),
          ipAddress   :ip[3],
          locality    :req.body.locality,
          city        :req.body.city,
          state       :req.body.state,
          country     :req.body.country,
          salt        :salt
          };
  if(req.body.password === req.body.confpassword){
      qb.insert('User', dbdata , function(err, cb) {
        if(err)
          {   if(err.message.substring(0,12) == "ER_DUP_ENTRY"){
                return res.json({error: true, message: "mailid already exists"});
               }
          }

      return res.json({error: false, message: "successfully registered"});
      });
   }
  else{return res.json({error:true, message: "kindly provide a valid confirm password"});}
 });

router.post("/login", function(req, res, next){
   qb.select("salt,password").where({email: req.body.email}).get("User", (er, cb) => {
     console.log(cb[0]);
        if(er) return next(er);
        var password = sha512.hmac(cb[0].salt).finalize(req.body.password).toString('hex');
     password == cb[0].password ? res.json({error:false,message:"successfully logged in"}): res.json({error:true, message:"kinldy provide a valid credentials"});
   });
});
router.post("/social/login", (req, res, next) => {
   qb.select("email, googleToken, facebookToken").where({email: req.body.email}).get('User', (er, cb) => {
        console.log("inside query");
        console.log(cb);
         if(er)return next(er);
         var social_login_type = req.body.social_login_type;
        var login_type = social_login_type+"Token";
              if(cb.length == 0){
               console.log(login_type);
                var  ip = req.ip.split(':');
             var dbdata = {
               firstName   : req.body.name,
               email       : req.body.email,
              accountType : "Google/Facebook",
              ipAddress   : ip[3]
             };
             console.log(dbdata[social_login_type+"Token"] = req.body.socialToken);
               console.log(dbdata);
                   qb.insert('User', dbdata , (err, c) => {
                   if(err) return next(err);
                   return res.json({error: false, message: "successfully registered"});
            });
        }
      if(cb.length > 0){
        !cb[0].googleToken && !cb[0].facebookToken ?res.json({error: true, message: "email already exists with common login"}):
        (cb[0].googleToken)? res.json({error:true,message:"you have already loged in with google"}):res.json({error:true,message:"you have already loged in with Facebook"});
    }
   });
});

var nodemailer = require("nodemailer");
router.post("/forgot/password", function(req, res, next) {
      qb.select("email").where({email: req.body.email}).get("User", (er, cb) =>{
        if(er) return next(er);
        if(cb.length == 0) return func.fail(res, "kindly enter the valid mail id");
      var dbdata = {
              password: req.body.password===req.body.confirmpass ? req.body.password:"Kindly provide a valid confirmpass"
        };
        console.log(dbdata);
        if(dbdata.password === "Kindly provide a valid confirmpass")return func.fail(res, dbdata.password);
          qb.update('User', dbdata, {email: req.body.email}, function(err, cb){
                  if(err) return next(err);
                //  node mailer pending
               return  func.success(res, "successfully password changed");
        });
  });
});
  router.get("/app/settings", (req, res, next) => {
    pool.get_connection(q =>{
      q.select("*").get("App_Settings" , (e, c) =>{
        if(e)return next(e);
         return func.success(res, c);
      });
    });
});
router.get("/user/view", (req, res, next) => {
  pool.get_connection(q =>{
    q.select("*").where({id:req.query.id}).get("User" , (e, c) =>{
      if(e)return next(e);
       return func.success(res, c);
    });
  });
});

router.post("/test", function(req, res, next) {
  pool.get_connection(q => {
    console.log("/test");
      q.select("*").get("User", (er, cb) =>{
        q.release();
         if(er) return next(er);
          return func.success(res, cb);
     });
  });
});

module.exports = router;
