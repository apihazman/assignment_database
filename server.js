const { MongoClient, ServerApiVersion, MongoCursorInUseError } = require('mongodb');
const uri ="mongodb+srv://hafizazman:apihazman0091@apihazmann.nlommix.mongodb.net/?retryWrites=true&w=majority";
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect the client to the server (optional starting in v4.7)
async function run() {
    try {
      // Connect the client to the server  (optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("You successfully connected to MongoDB!");
    app.use(express.json());
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });

    app.post('/regAdmin', async (req, res) => {
      let data = req.body;
      res.send(await regAdmin(client, data));
    });

    app.post('/login', async (req, res) => {
      let data = req.body;
      res.send(await login(client, data));
    });

    app.post('/register', authenticateToken, async (req, res) => {
      let data = req.user;
      let dataUser = req.body;
      res.send(await register(client, data, dataUser));
    });

    app.get('/read', authenticateToken, async (req, res) => {
      let data = req.user;
      res.send(await read(client, data));
    });

    app.patch('/updateVisitor', authenticateToken, async (req, res) => {
      let data = req.user;
      let dataUser=req.body;
      res.send(await updateVisitorInformation(client, data));
    });

    app.delete('/deleteVisitor', authenticateToken, async (req, res) => {
      let data = req.user;
      res.send(await deleteVisitor(client, data));
    });

    app.post('/checkIn', authenticateToken, async (req, res) => {
      let data = req.user;
      let dataUser = req.body;
      res.send(await checkIn(client, data, dataUser));
    });

    app.patch('/checkOut', authenticateToken, async (req, res) => {
      let data = req.user;
      res.send(await checkOut(client, data));
    });
} catch (e) {
    console.error(e);

  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.error);
//encrypt Password
  async function encryptPassword(password) {
    const hash = await bcrypt.hash(password, saltRounds);
     return hash;
    }
    async function decryptPassword(password, compare) {
      const match = await bcrypt.compare(password, compare)
      return match
    
    }
    //register function
    async function register(client, data, dataUser) {

      temporary = await client.db('assignment').collection('data').findOne({username: dataUser.username})
    if(!temporary) {
    
      if (data.role === 'Admin') {
        const result = await client.db('assignment').collection('data').insertOne({
          username: dataUser.username,
          password: await encryptPassword(dataUser.password),
          name: dataUser.name,
          email: dataUser.email,
          role: 'Security',
          visitors: []
        });
        return 'Security registered successfully';
      }else
    
      if (data.role === 'Security') {
        const result = await client.db('assignment').collection('data').insertOne({
          username: dataUser.username,
          password: await encryptPassword(dataUser.password),
          name: dataUser.name,
          ic: dataUser.ic,
          email: dataUser.email,
          phone: dataUser.phone,
          vehicleNo: dataUser.vehicleNo,
          department: dataUser.department,
          company: dataUser.company,
          role: 'Visitor',
          security: data.username,
          records: []
        });
    
        const result1 = await client.db('assignment').collection('data').updateOne(
          { username: data.username },
          { $push: { visitors: dataUser.username } }
        );
        return 'Visitor registered successfully';
      }} else {
        return 'Username already in use, please enter another username'
      }   
    
      return 'You are not allowed to register';
    }
  function generateToken(user){
    return jwt.sign(
    user,    //this is an obj
    'mypassword',           //password
    { expiresIn: '1h' });  //expires after 1 hour
  }
  function authenticateToken(req, res, next) {
    let header = req.headers.authorization;
  
    if (!header) {
      return res.status(401).send('Unauthorized');
    }
  
    let token = header.split(' ')[1];
  
    jwt.verify(token, 'mypassword', function(err, decoded) {
      if (err) {
        console.error(err);
        return res.status(401).send('Invalid token');
      }
  
      req.user = decoded;
      next();
    });
  }
  //read from token and checking role to display 
  async function read(client, data) {
    if(data.role == 'Admin') {
      Admins = await client.db('assignment').collection('data').find({role:"Admin"}).next() //.next to read in object instead of array
      Security = await client.db('assignment').collection('data').find({role:"Security"}).toArray()
      Visitors = await client.db('assignment').collection('data').find({role:"Visitor"}).toArray()
      Records = await client.db('assignment').collection('Records').find().next()
      return {Admins, Security, Visitors, Records}
      }
  
    if (data.role == 'Security') {
      Security = await client.db('assignment').collection('data').findOne({username: data.username})
      Visitors = await client.db('assignment').collection('data').find({security: data.username}).toArray()   
      Records = await client.db('assignment').collection('Records').find({username: {$in:Security.visitors}}).toArray()
      return {Security, Visitors, Records}
      }
  
    if (data.role == 'Visitor') {
      Visitor = await client.db('assignment').collection('data').findOne({username: data.username})
      Records = await client.db('assignment').collection('Records').find({recordID: {$in:Visitor.records}}).toArray()
      return {Visitor, Records}
    }
  }
  //register admin 
  async function regAdmin(client, data) {
  const existingAdmin = await client
    .db("assignment")
    .collection("data")
    .findOne({ username: data.username, role: "Admin" });

  if (existingAdmin) {
    return "Admin already registered";
  }else {
    data.password = await encryptPassword(data.password);
  const result = await client.db("assignment").collection("data").insertOne(data);
  return 'Admin registered';
  }
    }
 //login 
  async function login(client, data) {
    const user = await client
      .db("assignment")
      .collection("data")
      .findOne({ username: data.username });
  
    if (user) {
      const isPasswordMatch = await decryptPassword(data.password, user.password);
  
      if (isPasswordMatch) {
        console.log("Token for " + user.name + ": " + generateToken(user));
        return Display(user.role);
      } else {
        return "Wrong password";
      }
    } else {
      return "User not found";
    }
  }
  //output 
  function Display(data) {
    if(data == 'Admin') {
      return "You are logged in as Admin\n You can Access:\n 1.Register Security\n 2. Read All Users and Records"
    } else if (data == 'Security') {
      return "You are logged in as Security\n You can Access:\n 1.Register Visitor\n 2. Check Data, Visitors and Their Records' Data\n 3. Delete Data\n"
    } else if (data == 'Visitor') {
      return "You are logged in as Visitor\n You can Access:\n 1. Check Data and Records\n 2. Check In\n 3. Check Out\n 4. Delete Data"
    }
  }
  
 //update visitor Info only visitor
  async function updateVisitorInformation(client, data) {
    let result = null;  // Initialize result variable
  
    if (data.role == 'Visitor') {
      result = await client
        .db('assignment')
        .collection('data')
        .findOneAndUpdate(
          { username: dataUser.username },
          {
            $set: {
              phone: dataUser.phone,
              vehicleNo: dataUser.vehicleNo,
              department: dataUser.department,
              company: dataUser.company,
            }
          }
        );
    }else{
      return 'Only visitor can update the information'
    }
    
    if (result && result.ok && result.value) {
      return 'Visitor information updated successfully';
    } else {
      return 'Failed to update visitor information';
    }

  }
    // Check-in 
    async function checkIn(client, data, dataUser) {
      const usersCollection = client.db('assignment').collection('data');
      const recordsCollection = client.db('assignment').collection('Records');
    
      const currentUser = await usersCollection.findOne({ username: data.username });
    
      if (!currentUser) {
        return 'User not found';
      }
    
      if (currentUser.currentCheckIn) {
        return 'Already checked in, please check out first!!!';
      }
    
      if (data.role !== 'Visitor') {
        return 'Only visitors can access check-in.';
      }
    
      const existingRecord = await recordsCollection.findOne({ recordID: dataUser.recordID });
    
      if (existingRecord) {
        return `The recordID '${dataUser.recordID}' is already in use. Please enter another recordID.`;
      }
    
      const currentCheckInTime = new Date();
    
      const recordData = {
        username: data.username,
        recordID: dataUser.recordID,
        purpose: dataUser.purpose,
        checkInTime: currentCheckInTime
      };
    
      await recordsCollection.insertOne(recordData);
    
      await usersCollection.updateOne(
        { username: data.username },
        {
          $set: { currentCheckIn: dataUser.recordID },
          $push: { records: dataUser.recordID }
        }
      );
    
      return `You have checked in at '${currentCheckInTime}' with recordID '${dataUser.recordID}'`;
    }
  // Check-out operation
  //Function to check out
async function checkOut(client, data) {
  const usersCollection = client.db('assignment').collection('data');
  const recordsCollection = client.db('assignment').collection('Records');

  const currentUser = await usersCollection.findOne({ username: data.username });

  if (!currentUser) {
    return 'User not found';
  }

  if (!currentUser.currentCheckIn) {
    return 'You have not checked in yet, please check in first!!!';
  }

  const checkOutTime = new Date();

  const updateResult = await recordsCollection.updateOne(
    { recordID: currentUser.currentCheckIn },
    { $set: { checkOutTime: checkOutTime } }
  );

  if (updateResult.modifiedCount === 0) {
    return 'Failed to update check-out time. Please try again.';
  }

  const unsetResult = await usersCollection.updateOne(
    { username: currentUser.username },
    { $unset: { currentCheckIn: 1 } }
  );

  if (unsetResult.modifiedCount === 0) {
    return 'Failed to check out. Please try again.';
  }

  return `You have checked out at '${checkOutTime}' with recordID '${currentUser.currentCheckIn}'`;
}
//delete visitor function
async function deleteVisitor(client, data) {
  const usersCollection = client.db("assignment").collection("data");
  const recordsCollection = client.db("assignment").collection("Records");

  // Delete user document
  const deleteResult = await usersCollection.deleteOne({ username: data.username });
  if (deleteResult.deletedCount === 0) {
    return "User not found";
  }

  // Delete related records
  await recordsCollection.deleteMany({ username: data.username });

  // Update visitors array in other users' documents
  await usersCollection.updateMany(
    { visitors: data.username },
    { $pull: { visitors: data.username } }
  );
  return "Delete Successful";
}