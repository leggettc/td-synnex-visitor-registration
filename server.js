/**
* This is the main Node.js server script for your project
* Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
*/

require('dotenv').config();
const path = require("path");
const got = require("got"); 
const NodeCache = require( "node-cache" );
const jose = require('jose')
const simpleCache = new NodeCache();

function CreateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false
});

// ADD FAVORITES ARRAY VARIABLE FROM TODO HERE


// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});


/**
* Our home page route
*
* Returns src/pages/index.hbs with data built into it
*/
fastify.get("/", function(request, reply) {
  
  // params is an object we'll pass to our handlebars template
  let params = { };
  
  const token_url =
    process.env.BASE_URL +
    "/v1/company/" +
    process.env.COMPANY_ID +
    "/sdkToken";

  got
    .get(token_url, {
      headers: {
        "X-SK-API-KEY": process.env.API_KEY
      }
    })
    .json()
    .then(data => {
       
      var tid = CreateUUID();
      simpleCache.set(tid, tid); 
    
       params = {
        access_token: data.access_token,
        api_key : process.env.API_KEY,
        company_id: process.env.COMPANY_ID,
        base_url: process.env.BASE_URL,
        reg_policy_id: process.env.REG_POLICY_ID,
        auth_policy_id: process.env.AUTH_POLICY_ID,
        tid: tid
         
      };
    
      simpleCache.set("access_token", data.access_token); 
    
      console.log("params: ", JSON.stringify(params));
      reply.view("/src/pages/index.hbs", params);
    })
    .catch(err => {
      console.log("SK Error: ", JSON.stringify(err));
      reply.send(err);
    });  
  
  // The Handlebars code will be able to access the parameter values and build them into the page
  //reply.view("/src/pages/index.hbs", params);
});

/**
* Widget page route
*
* Returns src/pages/widget.hbs with data built into it
*/

fastify.get("/widget", function(request, reply) {
  
  let accesstoken = simpleCache.get("access_token");
  
  // params is an object we'll pass to our handlebars template
   let params = {
        access_token: accesstoken,
        company_id: process.env.COMPANY_ID,
        base_url: process.env.BASE_URL
      };
  
    console.log("widget params: ", JSON.stringify(params));
  
  // The Handlebars code will be able to access the parameter values and build them into the page
  reply.view("/src/pages/widget.hbs", params);
});

/**
* Our POST route to handle and react to form submissions 
*
* Accepts body data indicating the user choice
*/
fastify.post("/validateToken", function(request, reply) {
  
  console.log("Token: " + request.body.token);
  const JWT = request.body.token;
  const JWKS = jose.createRemoteJWKSet(new URL(process.env.JWKS_ENDPOINT));
  
  (async () => {
  
    const { payload, protectedHeader } = await jose.jwtVerify(JWT, JWKS, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });

    console.log(protectedHeader);
    console.log(payload);
    
    // Build the params object to pass to the template
    let params = {   };


    reply.send({"sub" : payload.username});
  })();
  
});

fastify.get("/signin", function(request, reply) {
  
  // Build the params object to pass to the template
  
  var tid = request.query.tid;
  var email = request.query.email;
  var numdeleted = simpleCache.del(tid);
  
  if(numdeleted == 1){
    console.log("tid: " + tid + " removed from cache.");
  } else {
    console.log("tid: " + tid + " not found...");
  }
  
  reply.redirect("/?showsignin=true&email=" + email);
});

fastify.get("/checktid", function(request, reply) {
  
  var tid = request.query.tid;
  var foundtid = simpleCache.get(tid);
  var result = "false";
  
  if(tid == foundtid){
    result = "true";
  }
  
  reply.send({tidFound: result});
  
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT, '0.0.0.0', function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
