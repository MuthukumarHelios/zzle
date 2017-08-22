console.log("controller.js");
var router = require('express').Router();
var mysql = require('mysql');

var func = require("./function.js");

var pool_query  = mysql.createPool({
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
var jwt = require('jsonwebtoken');
var multer = require('multer')().any();
var nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
                  host: 'smtp.gmail.com',
                  port: 465,
                  secure: true, // secure:true for port 465, secure:false for port 587
                  auth: {
                      user: 'nareshpraba9@gmail.com',
                      pass: '9551447625'
                  }
              });

// api
// User register

router.post("/signup", multer, (req, res) => {
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
        let mailOptions = {
          to: dbdata.email,
          subject: "Zzle app login regards",
          text: 'Thank you for registered in zzle app',
          html: `<h4>good to hear this <h3>${dbdata.firstName}</h3> are using our app</h4>`
        };
        transporter.sendMail(mailOptions, (er, cb) => {
          if(er)return func.fail(res, "kinldy enter the valid email id for registration");
            qb.insert('User', dbdata , function(err, cb) {
                if(err){
                     if(err.message.substring(0,12) == "ER_DUP_ENTRY"){
                     return res.json({error: true, message: "mailid already exists"});
                    }
                return next(err);
          }
          return func.success(res, "successfully registered");
         });
      });
   }
  else{return res.json({error:true, message: "kindly provide a valid confirm password"});}
 });


router.post("/login", multer, function(req, res, next){
  console.log(req.body);
   qb.select("salt,password, email").where({email: req.body.email}).get("User", (er, cb) => {
        if(er)return next(er);
        console.log(cb);
        if(cb.length == 0) return func.fail(res, "Kindly provide a valid Credentials");
        var password = sha512.hmac(cb[0].salt).finalize(req.body.password).toString('hex');
        var token = jwt.sign({email: cb[0].email},'secret');
        password == cb[0].password
            ? res.json({error:false,message:"successfully logged in",access_token:token,uniqid:cb[0].salt})
            : res.json({error:true, message:"Kinldy provide a valid Credentials"});
   });
});

// social login @User

router.post("/social/login", multer, (req, res, next) => {
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
                   var token = jwt.sign({email: dbdata.email},'secret');
                   return res.json({error: false, message: "successfully registered"});
            });
        }
         if(cb.length > 0){
          !cb[0].googleToken && !cb[0].facebookToken ?res.json({error: true, message: "email already exists with common login"}):
          (cb[0].googleToken)? res.json({error:true,message:"you have already logged in with google"}):res.json({error:true,message:"you have already logged in with Facebook"});
    }
   });
});

// forgot password with sending mail id
router.post("/forgot/password", multer, function(req, res, next) {
      qb.select("email, salt").where({email: req.body.email}).get("User", (er, cb) =>{
        if(er) return next(er);
        if(cb.length == 0) return func.fail(res, "kindly enter the valid mail id");
      var dbdata = {
              password: req.body.password===req.body.confirmpass ? req.body.password:"Kindly provide a valid confirmpass"
        };
        console.log(dbdata);
        if(dbdata.password === "Kindly provide a valid confirmpass")return func.fail(res, dbdata.password);
        if(!dbdata.password)return func.fail(res, "kinldy enter password");
        var hash_with_key = sha512.hmac(cb[0].salt);
        dbdata.password = hash_with_key.finalize(dbdata.password).toString('hex');
          qb.update('User', dbdata, {email: req.body.email}, function(err, cb){
                  if(err) return next(err);
                  let mailOptions = {
                    to: req.body.email,
                    subject: "Zzle app password changed regards",
                    text: 'your new password',
                     html: `<h4>good to hear this<br><h3>Milid:${req.body.email}New password${req.body.password}</h3> are using our app</h4>`
                 };
                 transporter.sendMail(mailOptions, (er, cb) => {
               if(er)return func.fail(res, "something wrong with gateway mailid");
                if(cb.accepted.indexOf(req.body.email) !==-1)
                   return  func.success(res, "successfully password changed");
                 });
             });
     });
});


router.put("/change/password", [multer,func.authenticate], function(req, res, next) {
  qb.select("email, salt").where({salt: req.body.uniqid}).get("User", (er, cb) =>{
    if(er) return next(er);
    if(cb.length == 0) return func.fail(res, "kindly enter the valid uniqid");
    var dbdata = {
      password: req.body.password === req.body.confirmpass ? req.body.password:"Kindly provide a valid confirmpass"
    };

    if(dbdata.password === "Kindly provide a valid confirmpass")return func.fail(res, dbdata.password);
     if(!dbdata.password)return func.fail(res, "kinldy enter password");
    var hash_with_key = sha512.hmac(cb[0].salt);
        dbdata.password = hash_with_key.finalize(dbdata.password).toString('hex');
           qb.update('User', dbdata, {salt: req.body.uniqid}, function(err, cb){
            if(err) return next(err);
              return  func.success(res, "successfully password changed");
    });
  });
});
  router.get("/app/settings",[multer,func.authenticate], (req, res, next) => {
    pool.get_connection(q =>{
       q.select("*").get("App_Settings" , (e, c) =>{
         q.release();
         if(e) return next(e);
         return func.success(res, c);
      });
    });
});


router.get("/user/view", func.authenticate, (req, res, next) => {
  pool.get_connection(q =>{
    q.select("*").where({salt:req.query.uniqid}).get("User" , (e, c) =>{
      q.release();
        if(e)return next(e);
        return func.success(res, c);
    });
  });
});


router.put("/edit/profile", [multer, func.authenticate], (req, res, next) => {
  console.log("headers check",req.headers);
    pool.get_connection(q => {
      var dbdata = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        image: req.body.image
      };
      q.update('User',dbdata, {salt: req.body.uniqid}, (er, c) => {
        q.release();
        if(er)return next(er);
        if(c.affectedRows == 0)return res.json({error:true, message: "kinldy provide a valid uniqid"});
        console.log(c);
        return res.json({error:false, message:"successfully edited"});
      });
    });
});


router.post("/puzzle/categoreis", [multer,func.authenticate], function(req, res, next) {
  pool.get_connection(q => {
    console.log("/test");
    q.select("*").get("Puzzle_Categories", (er, cb) =>{
      q.release();
      if(er) return next(er);
      return func.success(res, cb);
    });
  });
});


router.post("/puzzle/create", [multer,func.authenticate], function(req, res, next) {
  pool.get_connection(q => {
  q.select("id,firstName").where({salt:req.body.uniqid}).get("User", (err, cbb) => {
    q.release();
       if(err)return next(err);
       if(!cbb.length)return func.fail(res, "kindly provide a valid uniqid");
             var dbdata = {
           puzzleCode           : randomstring.generate(8),
           title                : req.body.title,
           questionTextContent  :req.body.questionTextContent,
           questionImageContent :req.body.questionImageContent,
           answerTextContent    :req.body.answerTextContent,
           answerImageContent   : req.body.answerImageContent,
           puzzleCategory       :req.body.puzzleCategory,             //foreign key
           publishingStatus     :1,
           puzzleCreatedBy      :cbb[0].id            //foreign key
        };
        console.log("/test");
      q.insert("Puzzle" , dbdata, (er, cb) =>{
      if(er) return next(er);
      return func.success(res, `puzze created successfully`);
     });
    });
  });
});

router.get('/puzzle/list', func.authenticate, (req, res, next) => {
  pool.get_connection(q => {
    console.log("/test");
      q.select("*").get("Puzzle", (er, cb) =>{
        q.release();
         if(er) return next(er);
          return func.success(res, cb);
     });
  });
});

router.get('/puzzle/list/user', func.authenticate, (req, res, next) => {
  pool.get_connection(q => {
    console.log("/test");
    q.select("*").where({salt: req.query.uniqid}).get("User", (err, cbb) => {
      q.release();
         q.select("*").where({puzzleCreatedBy:cbb[0].id}).get("Puzzle", (er, cb) =>{
           if(er) return next(er);
            return func.success(res, cb);
        });
       });
   });
});
router.post('/puzzle/star', [multer,func.authenticate], (req, res, next) => {
   pool.get_connection(q => {
      q.release();
          console.log("/test");
        pool_query.getConnection((errr, connection) => {
           if(errr) return next(errr);
          //  var query_string = 'select * from User join Starred_Puzzles on User.id = Starred_Puzzles.userId where Starred_Puzzles.userId = '+req.body.userId+' AND User.salt = '+req.body.uniqid+'';
         var query_string = `select * from User join Starred_Puzzles
                                      on User.id = Starred_Puzzles.userId
                               where Starred_Puzzles.userId = ${req.body.puzzleid}
                                     and User.salt = "${req.body.uniqid}"`;
           connection.query(query_string, (e, c) => {
             connection.release();
                 if(e)return next(e);
                 console.log(c);
                 if(c.length > 0)return func.success(res, "you are allowed to vote only one time");
                  q.select("id").where({salt: req.body.uniqid}).get("User", (err, cbb) => {
                    var dbdata = {
                       userId:cbb[0].id,
                       puzzleId:req.body.puzzleid
                   };
                q.insert("Starred_Puzzles", dbdata, (er, cb) =>{
                  console.log(cb);
                 if(er) return next(er);
                 return func.success(res, "successfully Stared the puzzle");
            });
          });
        });
       });
    });
 });


router.delete('/puzzle/unstar', [multer,func.authenticate], (req, res, next) => {
         pool.get_connection(q => {
          q.release();
            q.select('id').where({salt: req.body.uniqid}).get("User", (er, cb) =>{
              console.log(cb);
                 if(er)return next(er);
                  q.delete("Starred_Puzzles", {userId: cb[0].id , puzzleId:req.body.puzzleid}, (err, c) => {
                    if(err)return next(err);
                    if(c.affectedRows == 0)return res.json({error: true, message: "you did not star the puzzle so you cannot unstar it"});
                     return func.success(res, "successfully unstar the puzzle");
            });
         });
    });
});

// starred puzzles which was made by the particular user

router.post("/user/puzzles/starred", [multer,func.authenticate], (req, res, next) => {

   pool_query.getConnection((e, connection) => {
     if(e)return next(e);
       var query = `SELECT p.puzzleCode,p.title, p.questionTextContent,p.questionImageContent FROM User as u
                  JOIN Starred_Puzzles  as st ON  u.id = st.userId
                         Join Puzzle as p on u.id = p.puzzleCreatedBy where u.salt = '${ req.body.uniqid}'group by u.id`;
          connection.query(query, (er, cb) => {
                if(er)return next(er);
                 return func.success(res, cb);
       });
    });
});


router.get("/leaderboard", [multer,func.authenticate], function(req, res, next) {
  if(req.query.puzzleCategoryId){var concat =`WHERE Puzzle_Categories.id = ${req.query.puzzleCategoryId}`;}
    else {var concat = "";}
      var query =   `SELECT (@cnt := @cnt + 1) AS Rank,User.*,COUNT(Starred_Puzzles.puzzleId) + COUNT(Puzzle.puzzleCreatedBy) * 50 as Points FROM User
         LEFT JOIN Puzzle on User.id = Puzzle.puzzleCreatedBy
          LEFT JOIN Starred_Puzzles on Puzzle.puzzleCreatedBy = Starred_Puzzles.puzzleuserId AND
           Starred_Puzzles.puzzleId = Puzzle.id
              LEFT JOIN Puzzle_Categories on Puzzle.puzzleCategory = Puzzle_Categories.id
               CROSS JOIN (SELECT @cnt := 0) AS dummy ${concat}
                                     group by User.id Order by Points DESC`;
                pool_query.getConnection((e, connection) => {
                       if(e)return next(e);
                          connection.query(query, function(er, cb){
                           if(er)return next(er);
                           var array = [];
                           cb.map((a)=>{
                                 if(a.salt == req.query.uniqid){
                                  cb.slice(a);
                          console.log("user data",a);
                           }
                        });
                  return func.success(res, cb);
        });
      });
   });

router.get("/test", [multer,func.authenticate], function(req, res, next) {
    pool.get_connection(q => {
      q.release();
        console.log("/test");
         q.select("*").get("User u", (er, cb) =>{
          if(er)return next(er);
            if(er) return func.fail(res, "db error");
             return func.success(res, cb);
     });
  });
});


module.exports = router;
