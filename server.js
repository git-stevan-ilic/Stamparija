/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
import EventEmitter from "events";
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
const eventEmitter = new EventEmitter();
const io = new Server(server);


/*--Start Server-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
app.use(express.static(__dirname));
app.get("/", (req, res)=>{res.sendFile(__dirname+"/index.html")});
server.listen(process.env.PORT, ()=>{console.log("Running at port "+process.env.PORT)});


/*--Input/Output-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
io.on("connection", (client)=>{
    if(allProducts.length !== 0) client.emit("all-product-data", allProducts);

    client.on("get-search-images", (searchResults, searchQuery)=>{
        let counter = 0, maxCounter = 0, listLength = searchResults.length;
        if(searchResults.length > 5) listLength = 5;
        for(let i = 0; i < listLength; i++){
            if(searchResults[i].type === 1) maxCounter++;
        }
        if(maxCounter === 0)
            client.emit("receive-search-images", searchResults, searchQuery);
        else{
            for(let i = 0; i < listLength; i++){
                if(searchResults[i].type === 1){
                    let id = searchResults[i].code.replaceAll(".", "");
                    loginAPI().then(token => {
                        getProductsAPI(token, id).then((productData)=>{
                            searchResults[i].img = productData.Images[0].Image;
                            counter++;
                            if(counter === maxCounter) client.emit("receive-search-images", searchResults, searchQuery);
                        }).catch(error => console.log("Product API Error:", error));
                    }).catch(error => console.log("Login Error:", error));
                }
            }    
        }
    });




    client.on("product-id", (id)=>{
        loginAPI().then(token => {
            getProductsAPI(token, id).then(productData => {
                let currID = id.slice(0, 5), productFound = false;
                for(let i = 0; i < allProducts.length; i++){
                    for(let j = 0; j < allProducts[i].Products.length; j++){
                        if(allProducts[i].Products[j].ID === currID){
                            client.emit("product-received", productData, allProducts[i].Products[j].versions);
                            productFound = true;
                            break;
                        }
                    }
                    if(productFound) break;
                }
            }).catch(error => console.log("Product API Error:", error));
        }).catch(error => console.log("Login Error:", error));
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


/*--Products-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
let allProducts = [];
function getProduct(){
    loginAPI().then((token)=>{
        getProductsAPI(token, null).then((data)=>{
            fs.readFile(process.env.API_PRODUCT_IDS, (error, jsonData)=>{
                if(error) console.log("Error reading JSON:", error);
                else{
                    let apiIDs = JSON.parse(jsonData);
                    generateUsedProducts(data, apiIDs);
                }
            });
            fs.writeFile("./json/backup.json", JSON.stringify(data, null, 4), (error)=>{
                if(error) console.log("Backup Write Error:", error);
            });
        }).catch(error => console.log("Product API Error:", error));
    }).catch(error => console.log("Login Error:", error));
}
function generateUsedProducts(data, apiIDs){
    console.log("Generating Product Data...");
    let allUsedProducts = [];

    for(let i = 0; i < data.length; i++){
        const currProductID = data[i].Id.slice(0, 5);
        for(let j = 0; j < apiIDs.length; j++){
            if(allUsedProducts[j] === undefined){
                allUsedProducts[j] = {
                    SubCategoryName:apiIDs[j].SubCategoryName,
                    CategoryName:apiIDs[j].CategoryName,
                    Products:[]
                }
            }
            for(let k = 0; k < apiIDs[j].IDs.length; k++){
                if(apiIDs[j].IDs[k] === currProductID){
                    let newVersion = {
                        SubCategoryName:apiIDs[j].SubCategoryName,
                        CategoryName:apiIDs[j].CategoryName,
                        ProductIdView:data[i].ProductIdView,
                        Price:data[i].Price,
                        Model:data[i].Model,
                        Name:data[i].Name,
                        ID:data[i].Id
                    }
                    let index = allUsedProducts[j].Products.findIndex(e => e.ID === currProductID);
                    if(index > -1) allUsedProducts[j].Products[index].versions.push(newVersion);
                    else{
                        allUsedProducts[j].Products.push({
                            versions:[newVersion],
                            ID:currProductID
                        });
                    }
                }
            }
        }
    }
    
    allProducts = allUsedProducts;
    eventEmitter.emit("updated-all-products");
    console.log("Generating Product Data Complete");
}

getProduct();
eventEmitter.on("updated-all-products", ()=>{
    io.emit("all-product-data", allProducts);
});














/*
console.log("Generating Product Data...");
    let allUsedProducts = [];for(let i = 0; i < data.length; i++){
        const currProductID = data[i].Id.slice(0, 5);
        for(let j = 0; j < apiIDs.length; j++){
            if(allUsedProducts[j] === undefined){
                allUsedProducts[j] = {
                    SubCategoryName:apiIDs[j].SubCategoryName,
                    CategoryName:apiIDs[j].CategoryName,
                    Products:[]
                }
            }
            if(apiIDs[j].All) continue;//allUsedProducts[j].Products.push(data[i]);
            else if(apiIDs[j].IDs.indexOf(currProductID) > -1){
                let index, productFound = false;
                for(let k = 0; k < allUsedProducts[j].Products.length; k++){
                    if(allUsedProducts[j].Products[k].ID === currProductID){
                        productFound = true;
                        index = k;
                        break;
                    }
                }
                if(productFound)
                    allUsedProducts[j].Products[index].versions.push(data[i]);
                else{
                    allUsedProducts[j].Products.push({
                        ID:currProductID,
                        versions:[data[i]]
                    });
                }
            }
            for(let m = 0; m < allUsedProducts[j].Products.length; m++){
                let product = allUsedProducts[j].Products[m];
                for(let n = 0; n < product.versions.length; n++){
                    loginAPI().then(token => {
                        getProductsAPI(token, product.versions[n].Id).then(productData => {
                            product.img = productData.Model.Image;
                            product.versions[n].HtmlColor = productData.Shade.HtmlColor;
                        }).catch(error => console.log("Product API Error:", error));
                    })
                }
            }
        }
    }
        allProducts = allUsedProducts;
    eventEmitter.emit("updated-all-products");
    console.log("Generating Product Data Complete");*/


/*


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
                        SubCategory:apiIDs[j].SubCategory,
                        CategoryName:apiIDs[j].CategoryName,
                        Category:apiIDs[j].Category,
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
                for(let m = 0; m < allUsedProducts[productIndex].products.length; m++){
                    let product = allUsedProducts[productIndex].products[m];
                    for(let n = 0; n < product.versions.length; n++){
                        loginAPI().then(token => {
                            if(!token) console.log("Token Invalid: ", token);
                            else{
                                getProductsAPI(token, product.versions[n].Id).then(productData => {
                                    product.img = productData.Model.Image;
                                    product.versions[n].HtmlColor = productData.Shade.HtmlColor;
                                });
                            }
                        })
                    }
                }
                break;
            }
        }
    }
    allProducts = allUsedProducts;
    console.log("Generating Product Data Complete");
    */














    /*
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
                    let productsDone = [];
                    for(let m = 0; m < subCategoryData.products.length; m++){
                        let colors = [];
                        for(let n = 0; n < subCategoryData.products[m].versions.length; n++){
                            let product = subCategoryData.products[m].versions[n];
                            loginAPI().then(token => {
                                if(!token) console.log("Token Invalid: ", token);
                                else{
                                    getProductsAPI(token, product.Id).then(productData => {
                                        colors.push(productData.Shade.HtmlColor);
                                        subCategoryData.products[m].img = productData.Model.Image;
                                        subCategoryData.products[m].versions[n].HtmlColor = productData.Shade.HtmlColor;
                                        if(colors.length === subCategoryData.products[m].versions.length){
                                            productsDone.push(1);
                                            if(productsDone.length === subCategoryData.products.length){
                                                client.emit("sub-category-received", subCategoryData);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                    break;
                }
            }
        });
    });*/












/*
 /*                 let currID = id.slice(0, 5), productFound = false;
                    for(let i = 0; i < allProducts.length; i++){
                        for(let j = 0; j < allProducts[i].products.length; j++){
                            if(currID === allProducts[i].products[j].id){
                                productFound = true;
                                let versionData = [];
                                for(let k = 0; k < allProducts[i].products[j].versions.length; k++){
                                    loginAPI().then(token => {
                                        if(!token) console.log("Token Invalid: ", token);
                                        else getProductsAPI(token, allProducts[i].products[j].versions[k].Id).then(data => {
                                            versionData.push(data);
                                            if(versionData.length === allProducts[i].products[j].versions.length){
                                                client.emit("product-received", productData, versionData, allProducts);
                                            }
                                        });
                                    });
                                }
                                break;
                            }
                        }
                        if(productFound) break;
                    }*/
















/*


{
        "all":false,
        "name":"Solje",
        "Category":"KS",
        "SubCategory":"KS - 01",
        "CategoryName":"Šolje / Flašice",
        "IDs":["44025", "44083", "44124", "44126", "44152", "44153", "44147", "44142", "44154", "44129", "44127", "44098", "44065"]
    },
    {
        "all":false,
        "name":"Flasice/Termosi",
        "Category":"KS",
        "SubCategory":"KS - 02",
        "CategoryName":"Šolje / Flašice",
        "IDs":["41164", "41162", "41158", "41108", "41165", "41163"]
    }






{
    "all":false,
    "name":"ID Trakice",
    "Category":"PT",
    "SubCategory":"PT - 02",
    "CategoryName":"Trakice ID Kartice / Nosač",
    "IDs":["35026", "35025", "35143", "34244", "35146", "35145"]
},
{
    "all":false,
    "name":"ID Nosaci",
    "Category":"PT",
    "SubCategory":"PT - 02",
    "CategoryName":"Trakice ID Kartice / Nosač",
    "IDs":["34676", "34675", "34674", "35144", "34645", "35138", "35133", "35131", "34360", "34073", "34015"]
},
{
    "all":false,
    "name":"Podloga za mis",
    "Category": "KA",
    "SubCategory":"KA - 02",
    "CategoryName":"Podloga za mis",
    "IDs":["37361"]
},




*/



/*
let productsDone = [];
for(let m = 0; m < subCategoryData.products.length; m++){
    let colors = [];
    for(let n = 0; n < subCategoryData.products[m].versions.length; n++){
        let product = subCategoryData.products[m].versions[n];
        loginAPI().then(token => {
            if(!token) console.log("Token Invalid: ", token);
            else{
                getProductsAPI(token, product.Id).then(productData => {
                    colors.push(productData.Shade.HtmlColor);
                    subCategoryData.products[m].img = productData.Model.Image;
                    subCategoryData.products[m].versions[n].HtmlColor = productData.Shade.HtmlColor;
                    if(colors.length === subCategoryData.products[m].versions.length){
                        productsDone.push(1);
                        if(productsDone.length === subCategoryData.products.length){
                            client.emit("sub-category-received", subCategoryData);
                        }
                    }
                });
            }
        });
    }
}*/




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