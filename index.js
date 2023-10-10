const express = require('express')
const app = express()
const port = 8000
const cors = require("cors");
var admin = require("firebase-admin");
var serviceAccount = require("./serviceKey.json");

const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200,
};
  
app.use(cors(corsOptions)); // CORS enabled on all routes
app.use(express.json());
app.use(express.urlencoded());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
var db = admin.firestore();


//Routes
app.get('/', (req, res) => res.send('Our backend is running!'))

app.get('/userData', async (req, res) => {
  console.log("hello")
  res.json({ name: 'pahul' });
});

app.post('/identify', (req, res) => {
    identify(`${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/details', (req, res) => {
    details(req.body.product, `${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/category', (req, res) => {
    category(req.body.category, `${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/buy', (req, res) => {
    buy(req.body.product, `${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/cart', (req, res) => {
    cart(req.body.product, `${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/price', (req, res) => {
    price(req.body.high, req.body.low, `${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/search', (req, res) => {
    search(req.body.query, `${req.body.fp}`);
    res.json({status: 'success'});
});

app.post('/login', async (req, res) => {
  try {
    const { fp, email } = req.body; // Destructure fp and email from req.body

    const usersRef = db.collection('users').doc(`${req.body.fp}`);
    const usersDoc = await usersRef.get();

    if (usersDoc.exists) {
      const userData = usersDoc.data();
      let currentArray = userData.values || []; // Use a default empty array if values doesn't exist

      if (!currentArray.includes(email)) {
        currentArray.push(email);
        // Update the document
        await usersRef.update({
          values: currentArray
        });
      }

      const data = { email, fp };
      await db.collection("emails").add(data); // Use add() to automatically generate a document ID

      console.log("Email successfully written!");
      res.json({ status: 'success' });
    } else {
      res.status(404).json({ status: 'error', error: 'User not found' });
    }
  } catch (error) {
    console.error("Error adding email: ", error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.post('/removecart', async (req, res) => {
    try {
      const { fp, product } = req.body; // Assuming the request body contains fingerprint and product.id
      
      // Reference to the document
      const cartDocRef = db.collection('users').doc(`${fp}`).collection('Cart').doc('CartDocument');
  
      const updateObject = {};
        updateObject[product.id] = admin.firestore.FieldValue.delete();

        await cartDocRef.update(updateObject);
  
      res.json({ status: 'success' });
    } catch (error) {
      console.error("Error removing item from the cart: ", error);
      res.status(500).json({ status: 'error', error: error.message });
    }
  });
  

const identify = async (fingerprint) => {
  const usersRef = db.collection('users').doc(fingerprint)

  usersRef.get()
    .then((docSnapshot) => {
      if (docSnapshot.exists) {
        return;
      } else {
         // create the document
         db.collection("users").doc(fingerprint).set({})
            .then(function() {
              console.log("Document successfully written!");
            })
            .catch(function(error) {
              console.error("Error writing document: ", error);
            });
      }
  });
  
};

const details = async (product, fingerprint) => {
    const usersRef = db.collection('users').doc(fingerprint)
    
    usersRef.get()
        .then((docSnapshot) => {
        if (docSnapshot.exists) {
            const data = {};
            data[`${product.id}`] = product;
            // update the document
            db.collection("users").doc(fingerprint).collection('Details').doc('detailsDocument').set(data, { merge: true })
            .then(function() {
                console.log("Document successfully written!");
            })
            .catch(function(error) {
            console.error("Error writing document: ", error);
            });
        } else {
            return;
        }
    });
}

const category = async (cat, fingerprint) => {
    const usersRef = db.collection('users').doc(fingerprint)
    
    usersRef.get().then(async (docSnapshot) => {
        if (docSnapshot.exists) {
          const scope = db.collection("users").doc(fingerprint).collection('Categories').doc('categoryDocument');
          
          // Fetch the current array or initialize it as an empty array
          let currentArray = [];
          const doc = await scope.get();
          if (doc.exists) {
            const data = doc.data();
            if (data && data.values && Array.isArray(data.values)) {
              currentArray = data.values;
            }
          }
      
          if (!currentArray.includes(cat)) {
            currentArray.push(cat);
          }
      
          // Update the document
          await scope.set({
            values: currentArray
          });
      
          console.log("Document successfully written!");
        } else {
          console.log("Document does not exist.");
        }
      }).catch(function(error) {
        console.error("Error reading/updating document: ", error);
      });
      
}

const buy = async (product, fingerprint) => {
    const usersRef = db.collection('users').doc(fingerprint)
    
    usersRef.get()
        .then((docSnapshot) => {
        if (docSnapshot.exists) {
            const data = {};
            data[`${product.id}`] = product;
            // update the document
            db.collection("users").doc(fingerprint).collection('Bought').doc('BuyDocument').set(data, { merge: true })
            .then(function() {
                console.log("Document successfully written!");
            })
            .catch(function(error) {
            console.error("Error writing document: ", error);
            });
        } else {
            return;
        }
    });
}

const cart = async (product, fingerprint) => {
    const usersRef = db.collection('users').doc(fingerprint)
    
    usersRef.get()
        .then((docSnapshot) => {
        if (docSnapshot.exists) {
            const data = {};
            data[`${product.id}`] = product;
            // update the document
            db.collection("users").doc(fingerprint).collection('Cart').doc('CartDocument').set(data, { merge: true })
            .then(function() {
                console.log("Document successfully written!");
            })
            .catch(function(error) {
            console.error("Error writing document: ", error);
            });
        } else {
            return;
        }
    });
}

const search = async (query, fingerprint) => {
    const usersRef = db.collection('users').doc(fingerprint)
    
    usersRef.get().then(async (docSnapshot) => {
        if (docSnapshot.exists) {
          const scope = db.collection("users").doc(fingerprint).collection('Search').doc('searchDocument');
          
          // Fetch the current array or initialize it as an empty array
          let currentArray = [];
          const doc = await scope.get();
          if (doc.exists) {
            const data = doc.data();
            if (data && data.values && Array.isArray(data.values)) {
              currentArray = data.values;
            }
          }
      
          if (!currentArray.includes(query)) {
            currentArray.push(query);
          }
      
          // Update the document
          await scope.set({
            values: currentArray
          });
      
          console.log("Document successfully written!");
        } else {
          console.log("Document does not exist.");
        }
      }).catch(function(error) {
        console.error("Error reading/updating document: ", error);
      });
      
}

const price = async (high, low, fingerprint) => {
    const usersRef = db.collection('users').doc(fingerprint)
    
    usersRef.get().then(async (docSnapshot) => {
        if (docSnapshot.exists) {
          const scope = db.collection("users").doc(fingerprint).collection('Price').doc('priceDocument');
          
          // Fetch the current array or initialize it as an empty array
          let currentArray = [];
          const doc = await scope.get();
          if (doc.exists) {
            const data = doc.data();
            if (data && data.values && Array.isArray(data.values)) {
              currentArray = data.values;
            }
          }
      
          if (!currentArray.includes({high : high, low : low})) {
            currentArray.push({high : high, low : low});
          }
      
          // Update the document
          await scope.set({
            values: currentArray
          });
      
          console.log("Document successfully written!");
        } else {
          console.log("Document does not exist.");
        }
      }).catch(function(error) {
        console.error("Error reading/updating document: ", error);
      });
      
}
app.listen(port, ()=> console.log(`Dolphin app listening on port ${port}!`))