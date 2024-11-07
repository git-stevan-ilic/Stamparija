/*--Load Constants---------------------------------------------------------------------------------------------------------------------------------*/
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();
const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const io = new Server(server);


/*--Start Server-----------------------------------------------------------------------------------------------------------------------------------*/
app.use(express.static(__dirname));
app.get("/", (req, res)=>{res.sendFile(__dirname+"/index.html")});
server.listen(process.env.PORT, ()=>{console.log("Running at port "+process.env.PORT)});


/*--Input/Output-----------------------------------------------------------------------------------------------------------------------------------*/
io.on("connection", (client)=>{
    client.emit("all-product-data", allProducts);
});
async function loginAPI(){
    const username = process.env.LOGIN_USERNAME;
    const password = process.env.LOGIN_PASSWORD;
    const data = {grant_type:"password", username:username, password:password};
    const formData = new URLSearchParams(data).toString();

    const apiRootUrl = process.env.ROOT_URL;
    const apiLoginEndpoint = process.env.LOGIN_ENDPOINT;
    const url = apiRootUrl + apiLoginEndpoint;

    const token = await axios.post(url, formData)
    .then(response => {return response.data.token_type + " " + response.data.access_token})
    .catch(error => console.error("Login Error: ", error));
    return token;
}
async function getProductsAPI(accessToken, productID){
    let apiProductID = "";
    if(productID !== null) apiProductID = "/"+productID;
    const apiRootUrl = process.env.ROOT_URL;
    const apiLoginEndpoint = process.env.PRODUCT_ENDPOINT;
    const url = apiRootUrl + apiLoginEndpoint + apiProductID;
    const header = {headers:{Authorization:accessToken}}

    const product = await axios.get(url, header)
    .then(response => {return response.data})
    .catch(error => console.error("Product Error: ", error));
    return product;
}


/*--Products---------------------------------------------------------------------------------------------------------------------------------------*/
let allProducts = [];
function getProduct(productID){
    loginAPI().then(token => {
        if(!token) console.log("Token Invalid: ", token);
        else{
            getProductsAPI(token, productID).then(data => {
                fs.readFile(process.env.API_PRODUCT_IDS, (error, jsonData)=>{
                    if(error) console.log("Error reading JSON");
                    else{
                        let apiIDs = JSON.parse(jsonData);
                        generateUsedProducts(data, apiIDs);
                    }
                });
            });
        }
    });
}
function generateUsedProducts(data, apiIDs){
    let allUsedProducts = [];
    console.log("Generating Product Data...");
    for(let i = 0; i < data.length; i++){
        const currProductID = data[i].Id.slice(0, 5);

        for(let j = 0; j < apiIDs.length; j++){
            if(data[i].SubCategory === apiIDs[j].SubCategory){
                let productIndex, categoryFound = false;
                for(let k = 0; k < allUsedProducts.length; k++){
                    if(allUsedProducts[k].SubCategory === data[i].SubCategory){
                        categoryFound = true;
                        productIndex = k;
                        break;
                    }
                }
                if(!categoryFound){
                    productIndex = allUsedProducts.length;
                    allUsedProducts.push({
                        SubCategory:data[i].SubCategory,
                        name:apiIDs[j].name,
                        products:[]
                    });
                }
                if(apiIDs[j].all) allUsedProducts[productIndex].products.push(data[i]);
                else{
                    for(let k = 0; k < apiIDs[j].IDs.length; k++){
                        if(apiIDs[j].IDs[k] === currProductID){
                            allUsedProducts[productIndex].products.push(data[i]);
                        }
                    }
                }
                break;
            }
        }
    }
    allProducts = allUsedProducts;
    console.log("Generating Product Data Complete");
}
getProduct(null);






















/*const token = await fetch(url, {
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:formData
    })
    .then(response => {
        if(!response.ok) console.log("Bad Response: ", response);
        else response.json();
    })
    .then(data => {
        if(!data) console.log("Login Data Invalid: ", data);
        else return data.token_type + " " + data.access_token;
    })
    .catch(error => console.log("Token Error: ", error));
    return token;*/

/*let product = await fetch(url, {
        method:"GET",
        headers:{
            "Authorization":accessToken,
            "Content-Type":"application/json"
        }
    })
    .then(response => {
        if(response.status !== 200) console.log("Bad Response: ", response);
        else response.json();
    })
    .then(data => {
        if(!data) console.log("Product Data Invalid: ", data);
        else return data;
    })
    .catch(error => console.log("Product Error: ", error));
    return product;*/