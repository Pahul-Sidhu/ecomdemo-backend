const express = require("express");
const app = express();
const port = 8000;
const cors = require("cors");
var admin = require("firebase-admin");
var serviceAccount = require("./serviceKey.json");
const searchAlgolia = require("./algolia");
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions)); // CORS enabled on all routes
app.use(express.json());
app.use(express.urlencoded());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
var db = admin.firestore();

//Routes
app.get("/", (req, res) => res.send("Our backend is running!"));

app.post("/searchAlgolia", async (req, res) => {
  const query = req.body.query;
  searchAlgolia(query)
  .then((results) => {
    // Handle the search results here
    res.json({ status: "success", data: results });
    return
  })
  .catch((err) => {
    // Handle any errors that occurred during the search
    res.json({ status: "failed", data: [] });
    return
  });
})

app.post("/userData", async (req, res) => {
  let identifier = req.body.id;
  let formattedText = {};
  const usersRef = db.collection("users").doc(identifier);
  const bought = usersRef.collection("Bought");
  const cart = usersRef.collection("Cart");
  const categories = usersRef.collection("Categories");
  const details = usersRef.collection("Details");
  const search = usersRef.collection("Search");

  if ((await bought.doc("BuyDocument").get()).exists) {
    const boughtDoc = await bought.doc("BuyDocument").get();
    if (boughtDoc.data() && Object.keys(boughtDoc.data()).length > 0) {
      formattedText["Books bought"]  = fillData(boughtDoc);
    }
  }

  if ((await cart.doc("CartDocument").get()).exists) {
    const CartDoc = await bought.doc("CartDocument").get();
    if (CartDoc.data() && Object.keys(CartDoc.data()).length > 0) {
      formattedText["Books added to cart"] = fillData(CartDoc);
    }
  }

  if ((await categories.doc("categoryDocument").get()).exists) {
    const categoriesDoc = await categories.doc("categoryDocument").get();
    if (categoriesDoc.data() && Object.keys(categoriesDoc.data()).length > 0) {
      formattedText["Categories of books user interested in"] = categoriesDoc.data().values.join(", ");
    }
  }

  if ((await details.doc("detailsDocument").get()).exists) {
    const detailsDoc = await details.doc("detailsDocument").get();
    if (detailsDoc.data() && Object.keys(detailsDoc.data()).length > 0) {
      formattedText["Books whose details user has seen"]  = fillData(detailsDoc);
    }
  }

  if ((await search.doc("searchDocument").get()).exists) {
    const searchDoc = await search.doc("searchDocument").get();
    if (searchDoc.data() && Object.keys(searchDoc.data()).length > 0) {
      formattedText["Topics user has searched for on our website"] = searchDoc.data().values.join(", ");
    }
  }

  res.json({ status: "success", data: formattedText });
});

const fillData = (boughtDoc) => {
  let res = [];
  const jsonData = boughtDoc.data();
  for (const bookId in jsonData) {
    let formattedText = {};
    const book = jsonData[bookId];

    formattedText["Name"] = book.volumeInfo.title;
    formattedText["Author"] = book.volumeInfo.authors
      ? book.volumeInfo.authors.join(", ")
      : "Unknown";
    formattedText["Price"] = book.price ? `$${book.price}` : "Not Available";
    formattedText["Description"] =
      book.volumeInfo.description || "Not Available";
    formattedText["Image URL"] = book.volumeInfo.imageLinks
      ? book.volumeInfo.imageLinks.thumbnail
      : "Not Available";

    res.push(formattedText);
  }

  return res;
};

app.post("/identify", (req, res) => {
  identify(`${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/details", (req, res) => {
  details(req.body.product, `${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/category", (req, res) => {
  category(req.body.category, `${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/buy", (req, res) => {
  buy(req.body.product, `${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/cart", (req, res) => {
  cart(req.body.product, `${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/price", (req, res) => {
  price(req.body.high, req.body.low, `${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/search", (req, res) => {
  search(req.body.query, `${req.body.fp}`);
  res.json({ status: "success" });
});

app.post("/login", async (req, res) => {
  try {
    const { fp, email } = req.body; // Destructure fp and email from req.body

    const usersRef = db.collection("users").doc(`${req.body.fp}`);
    const usersDoc = await usersRef.get();

    if (usersDoc.exists) {
      const userData = usersDoc.data();
      let currentArray = userData.values || []; // Use a default empty array if values doesn't exist

      if (!currentArray.includes(email)) {
        currentArray.push(email);
        // Update the document
        await usersRef.update({
          values: currentArray,
        });
      }

      const data = { email, fp };
      await db.collection("emails").add(data); // Use add() to automatically generate a document ID

      console.log("Email successfully written!");
      res.json({ status: "success" });
    } else {
      res.status(404).json({ status: "error", error: "User not found" });
    }
  } catch (error) {
    console.error("Error adding email: ", error);
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.post("/removecart", async (req, res) => {
  try {
    const { fp, product } = req.body; // Assuming the request body contains fingerprint and product.id

    // Reference to the document
    const cartDocRef = db
      .collection("users")
      .doc(`${fp}`)
      .collection("Cart")
      .doc("CartDocument");

    const updateObject = {};
    updateObject[product.id] = admin.firestore.FieldValue.delete();

    await cartDocRef.update(updateObject);

    res.json({ status: "success" });
  } catch (error) {
    console.error("Error removing item from the cart: ", error);
    res.status(500).json({ status: "error", error: error.message });
  }
});

const identify = async (fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef.get().then((docSnapshot) => {
    if (docSnapshot.exists) {
      return;
    } else {
      // create the document
      db.collection("users")
        .doc(fingerprint)
        .set({})
        .then(function () {
          console.log("Document successfully written!");
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    }
  });
};

const details = async (product, fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef.get().then((docSnapshot) => {
    if (docSnapshot.exists) {
      const data = {};
      data[`${product.id}`] = product;
      // update the document
      db.collection("users")
        .doc(fingerprint)
        .collection("Details")
        .doc("detailsDocument")
        .set(data, { merge: true })
        .then(function () {
          console.log("Document successfully written!");
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    } else {
      return;
    }
  });
};

const category = async (cat, fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef
    .get()
    .then(async (docSnapshot) => {
      if (docSnapshot.exists) {
        const scope = db
          .collection("users")
          .doc(fingerprint)
          .collection("Categories")
          .doc("categoryDocument");

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
          values: currentArray,
        });

        console.log("Document successfully written!");
      } else {
        console.log("Document does not exist.");
      }
    })
    .catch(function (error) {
      console.error("Error reading/updating document: ", error);
    });
};

const buy = async (product, fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef.get().then((docSnapshot) => {
    if (docSnapshot.exists) {
      const data = {};
      data[`${product.id}`] = product;
      // update the document
      db.collection("users")
        .doc(fingerprint)
        .collection("Bought")
        .doc("BuyDocument")
        .set(data, { merge: true })
        .then(function () {
          console.log("Document successfully written!");
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    } else {
      return;
    }
  });
};

const cart = async (product, fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef.get().then((docSnapshot) => {
    if (docSnapshot.exists) {
      const data = {};
      data[`${product.id}`] = product;
      // update the document
      db.collection("users")
        .doc(fingerprint)
        .collection("Cart")
        .doc("CartDocument")
        .set(data, { merge: true })
        .then(function () {
          console.log("Document successfully written!");
        })
        .catch(function (error) {
          console.error("Error writing document: ", error);
        });
    } else {
      return;
    }
  });
};

const search = async (query, fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef
    .get()
    .then(async (docSnapshot) => {
      if (docSnapshot.exists) {
        const scope = db
          .collection("users")
          .doc(fingerprint)
          .collection("Search")
          .doc("searchDocument");

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
          values: currentArray,
        });

        console.log("Document successfully written!");
      } else {
        console.log("Document does not exist.");
      }
    })
    .catch(function (error) {
      console.error("Error reading/updating document: ", error);
    });
};

const price = async (high, low, fingerprint) => {
  const usersRef = db.collection("users").doc(fingerprint);

  usersRef
    .get()
    .then(async (docSnapshot) => {
      if (docSnapshot.exists) {
        const scope = db
          .collection("users")
          .doc(fingerprint)
          .collection("Price")
          .doc("priceDocument");

        // Fetch the current array or initialize it as an empty array
        let currentArray = [];
        const doc = await scope.get();
        if (doc.exists) {
          const data = doc.data();
          if (data && data.values && Array.isArray(data.values)) {
            currentArray = data.values;
          }
        }

        if (!currentArray.includes({ high: high, low: low })) {
          currentArray.push({ high: high, low: low });
        }

        // Update the document
        await scope.set({
          values: currentArray,
        });

        console.log("Document successfully written!");
      } else {
        console.log("Document does not exist.");
      }
    })
    .catch(function (error) {
      console.error("Error reading/updating document: ", error);
    });
};
app.listen(port, () => console.log(`Dolphin app listening on port ${port}!`));
