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
    client.on("search", (searchQuery)=>{
        let searchResults = [];
        for(let i = 0; i < allProducts.length; i++){
            if(allProducts[i].name.toLowerCase().indexOf(searchQuery) !== -1){
                searchResults.push({type:0, name:allProducts[i].name, SubCategory:allProducts[i].SubCategory});
            }
            for(let j = 0; j < allProducts[i].products.length; j++){
                let queryFound = false;
                for(let k = 0; k < allProducts[i].products[j].versions.length; k++){
                    let currProductVersion = allProducts[i].products[j].versions[k];
                    let nameIndex = currProductVersion.Name.toLowerCase().indexOf(searchQuery);
                    let modelIndex = currProductVersion.Model.toLowerCase().indexOf(searchQuery);
                    if(
                        (nameIndex !== -1 && (nameIndex === 0 || currProductVersion.Name[nameIndex-1] === " ")) || 
                        (modelIndex !== -1 && (modelIndex === 0 || currProductVersion.Model[modelIndex-1] === " "))
                    ){
                        queryFound = true;
                        break;
                    }
                }
                if(queryFound){
                    let newResult = JSON.parse(JSON.stringify(allProducts[i].products[j]));
                    newResult.type = 1;
                    searchResults.push(newResult);
                }
            }
        }
        client.emit("search-result-receive", searchQuery, searchResults);
    });
    client.on("category", (catQuery)=>{
        fs.readFile(process.env.API_PRODUCT_IDS, (error, jsonData)=>{
            if(error) console.log("Error reading JSON");
            let apiIDs = JSON.parse(jsonData);

            let categoryData = {
                category:catQuery,
                categoryName:"",
                subCategories:[],
                products:[]
            }
            for(let i = 0; i < apiIDs.length; i++){
                if(apiIDs[i].Category === catQuery){
                    categoryData.categoryName = apiIDs[i].CategoryName;
                    categoryData.subCategories.push({
                        SubCategory:apiIDs[i].SubCategory,
                        name:apiIDs[i].name
                    });
                    let currProducts;
                    for(let j = 0; j < allProducts.length; j++){
                        if(allProducts[j].SubCategory === apiIDs[i].SubCategory){
                            currProducts = allProducts[j].products;
                            break;
                        }
                    }
                    categoryData.products = categoryData.products.concat(currProducts);
                }
            }
            for(let i = 0; i < categoryData.subCategories.length; i++) categoryData.subCategories[i].type = 0;
            for(let i = 0; i < categoryData.products.length; i++) categoryData.products[i].type = 1;
            client.emit("category-received", categoryData);
        });
    });
    client.on("sub-category", (subcatQuery)=>{
        fs.readFile(process.env.API_PRODUCT_IDS, (error, jsonData)=>{
            if(error) console.log("Error reading JSON");
            let apiIDs = JSON.parse(jsonData);

            for(let i = 0; i < apiIDs.length; i++){
                if(apiIDs[i].SubCategory === subcatQuery){
                    let subCategoryData = {
                        categoryName:apiIDs[i].CategoryName,
                        subCategoryName:apiIDs[i].name,
                        subCategory:apiIDs[i].SubCategory,
                        category:apiIDs[i].Category,
                        products:[]
                    }
                    for(let j = 0; j < allProducts.length; j++){
                        if(allProducts[j].SubCategory === subcatQuery){
                            subCategoryData.products = allProducts[j].products;
                            break;
                        }
                    }
                    client.emit("sub-category-received", subCategoryData);
                    break;
                }
            }
        });
    });
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
                            let index, productFound = false;
                            for(let l = 0; l < allUsedProducts[productIndex].products.length; l++){
                                if(allUsedProducts[productIndex].products[l].id === currProductID){
                                    productFound = true;
                                    index = l;
                                    break;
                                }
                            }
                            if(productFound)
                                allUsedProducts[productIndex].products[index].versions.push(data[i]);
                            else{
                                allUsedProducts[productIndex].products.push({
                                    id:currProductID,
                                    versions:[data[i]]
                                });
                            }
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




/*

,
    {
        "all":false,
        "name":"ID Nosaci",
        "SubCategory":"",
        "IDs":["34676", "34675", "34674", "35144", "34645", "35138", "35133", "35131", "34360", "34073", "34015"]
    },
    {
        "all":false,
        "name":"Podloga za mis",
        "SubCategory":"",
        "IDs":["37361"]
    },
    {
        "all":false,
        "name":"Solje",
        "SubCategory":"",
        "IDs":["44025", "44083", "44124", "44126", "44152", "44153", "44147", "44142", "44154", "44129", "44127", "44098", "44065"]
    },
    {
        "all":false,
        "name":"Flasice/Termosi",
        "SubCategory":"",
        "IDs":["41164", "41162", "41158", "41108", "41165", "41163"]
    }
    */











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