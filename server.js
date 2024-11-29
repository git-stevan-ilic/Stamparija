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

    client.on("search", (searchQuery)=>{
        let searchResults = [];
        for(let i = 0; i < allProducts.length; i++){
            if(allProducts[i].SubCategoryName.toLowerCase().indexOf(searchQuery) !== -1){
                searchResults.push({type:0, SubCategoryName:allProducts[i].SubCategoryName, SubCategory:allProducts[i].SubCategory});
            }
            for(let j = 0; j < allProducts[i].Products.length; j++){
                let queryFound = false;
                for(let k = 0; k < allProducts[i].Products[j].versions.length; k++){
                    let currProductVersion = allProducts[i].Products[j].versions[k];
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
                    let newResult = JSON.parse(JSON.stringify(allProducts[i].Products[j]));
                    newResult.type = 1;
                    searchResults.push(newResult);
                }
            }
        }
        client.emit("search-result-receive", searchQuery, searchResults);
    });
    client.on("category", (catQuery)=>{
        let categoryData = {
            Category:catQuery,
            CategoryName:"",
            SubCategories:[],
            Products:[],
            Found:false,
            Img:""
        }
        for(let i = 0; i < allProducts.length; i++){
            if(allProducts[i].Category === catQuery){
                categoryData.Found = true;
                categoryData.CategoryName = allProducts[i].CategoryName;
                categoryData.SubCategories.push({
                    SubCategory:allProducts[i].SubCategory,
                    SubCategoryName:allProducts[i].SubCategoryName
                });
                let currProducts = allProducts[i].Products;
                categoryData.Products = categoryData.Products.concat(currProducts);
            }
        }
        for(let i = 0; i < categoryData.SubCategories.length; i++) categoryData.SubCategories[i].type = 0;
        for(let i = 0; i < categoryData.Products.length; i++) categoryData.Products[i].type = 1
        client.emit("category-received", categoryData);
    });
    client.on("sub-category", (subcatQuery)=>{
        let subCatFound = false;
        for(let i = 0; i < allProducts.length; i++){
            if(allProducts[i].SubCategory === subcatQuery){
                subCatFound = true;
                let subCategoryData = {
                    SubCategoryName:allProducts[i].SubCategoryName,
                    CategoryName:allProducts[i].CategoryName,
                    SubCategory:allProducts[i].SubCategory,
                    Category:allProducts[i].Category,
                    Products:[],
                    Found:true
                }
                let currProducts = allProducts[i].Products;
                subCategoryData.Products = subCategoryData.Products.concat(currProducts);
                for(let j = 0; j < subCategoryData.Products.length; j++) subCategoryData.Products[j].type = 1;
                client.emit("sub-category-received", subCategoryData);
                break;
            }
        }
        if(!subCatFound) client.emit("sub-category-received", {Found:subCatFound});
    });
    client.on("product-id", (id)=>{
        let currID = id.slice(0, 5), productFound = false;
        for(let i = 0; i < allProducts.length; i++){
            for(let j = 0; j < allProducts[i].Products.length; j++){
                if(allProducts[i].Products[j].ID === currID){
                    productFound = true;
                    let dataToSend = {
                        productData:allProducts[i].Products[j],
                        CategoryName:allProducts[i].CategoryName,
                        SubCategoryName:allProducts[i].SubCategoryName,
                        SubCategory:allProducts[i].SubCategory,
                        Category:allProducts[i].Category,
                        Found:productFound,
                        ID:id
                    }
                    client.emit("product-received", dataToSend);
                    break;
                }
            }
            if(productFound) break;
        }
        if(!productFound) client.emit("product-received", {Found:productFound});
    });
    client.on("studio-id", (id)=>{
        let productFound = false;
        for(let i = 0; i < allProducts.length; i++){
            for(let j = 0; j < allProducts[i].Products.length; j++){
                if(allProducts[i].Products[j].ID === id){
                    productFound = true;
                    let dataToSend = {Found:productFound, versions:allProducts[i].Products[j].versions}
                    client.emit("studio-received", dataToSend);
                }
            }
            if(productFound) break;
        }
        if(!productFound) client.emit("studio-received", {Found:productFound});
    })
});

/*--Products-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
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
    .catch(error => console.error("\n\n\nLogin Error:\n\n", error));
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
    .catch(error => {
        if(error.status === 404) console.log("Product with ID:"+productID+" is currenctly unavailable");
        else console.error("\n\n\nProduct Error:\n\n", error)}
    );
    return product;
}

let allProducts = [], generatedProducts = [];;
function getProduct(){
    loginAPI().then((token)=>{
        getProductsAPI(token, null).then((data)=>{
            fs.readFile(process.env.API_PRODUCT_IDS, (error, jsonData)=>{
                if(error) console.log("\n\n\nError reading JSON:\n\n", error);
                else{
                    let apiIDs = JSON.parse(jsonData);
                    generateUsedProducts(data, apiIDs);
                }
            });
        }).catch(error => console.log("\n\n\nProduct API Error:\n\n", error));
    }).catch(error => console.log("\n\n\nLogin Error:\n\n", error));
}
function generateUsedProducts(data, apiIDs){
    console.log("\nGenerating Product Data...");
    generatedProducts = [];

    for(let i = 0; i < data.length; i++){
        const currProductID = data[i].Id.slice(0, 5);
        for(let j = 0; j < apiIDs.length; j++){
            if(generatedProducts[j] === undefined){
                generatedProducts[j] = {
                    SubCategoryName:apiIDs[j].SubCategoryName,
                    CategoryName:apiIDs[j].CategoryName,
                    SubCategory:apiIDs[j].SubCategory,
                    Category:apiIDs[j].Category,
                    Products:[]
                }
            }
            for(let k = 0; k < apiIDs[j].IDs.length; k++){
                if(apiIDs[j].IDs[k] === currProductID){
                    let sizeIndex = data[i].Id.indexOf("-");
                    let allSizes = [], size = "";

                    let ID = data[i].Id, currVersion;
                    if(sizeIndex > -1){
                        size = data[i].Id.slice(sizeIndex + 1);
                        ID = data[i].Id.slice(0, sizeIndex);
                        allSizes = [size];
                    }
                    currVersion = {
                        SubCategoryName:apiIDs[j].SubCategoryName,
                        CategoryName:apiIDs[j].CategoryName,
                        ProductIdView:data[i].ProductIdView,
                        Price:data[i].Price,
                        Model:data[i].Model,
                        Name:data[i].Name,
                        Sizes:allSizes,
                        Images:[],
                        ID:ID,

                        Package:data[i].Package,
                        WMSHeight:data[i].WMSHeight,
                        HtmlColor:data[i].Shade.HtmlColor,
                        WMSWidth:data[i].WMSWidth,
                        WMSDepth:data[i].WMSDepth,
                        WMSDimUM:data[i].WMSDimUM,
                        WeightUM:data[i].WeightUM,
                        Weight:data[i].Weight
                    }
                    let productIndex = generatedProducts[j].Products.findIndex(e => e.ID === currProductID);
                    if(productIndex === -1){
                        generatedProducts[j].Products.push({
                            versions:[currVersion],
                            ID:currProductID
                        });
                    }
                    else{
                        if(sizeIndex === -1) generatedProducts[j].Products[productIndex].versions.push(currVersion);
                        else{
                            let foundIndex, sizeFound = false;
                            for(let p = 0; p < generatedProducts[j].Products[productIndex].versions.length; p++){
                                if(generatedProducts[j].Products[productIndex].versions[p].ID === ID){
                                    sizeFound = true;
                                    foundIndex = p;
                                    break;
                                }
                            }
                            if(!sizeFound) generatedProducts[j].Products[productIndex].versions.push(currVersion);
                            else generatedProducts[j].Products[productIndex].versions[foundIndex].Sizes.push(size);
                        }
                    }
                }
            }
        }
    }

    console.log("Generating Product Data Complete");
    console.log("Retrieving Product Image and Color Data...\n");
    
    let subCategoryNum = 0;
    for(let i = 0; i < generatedProducts.length; i++){
        let productNum = 0;
        if(generatedProducts[i].Products.length === 0){
            subCategoryNum++;
            let percent = Math.round(subCategoryNum / 34 * 100);
            let subCategoryNumDisplay = JSON.stringify(subCategoryNum).padStart(2, "0");
            console.log("Category Completed: "+subCategoryNumDisplay+"/34 Progress: "+percent+"%");
        }
        for(let j = 0; j < generatedProducts[i].Products.length; j++){
            let versionNum = 0;
            for(let k = 0; k < generatedProducts[i].Products[j].versions.length; k++){
                let currVersion = generatedProducts[i].Products[j].versions[k];
                let currVersionID = currVersion.ID;
                if(currVersion.Sizes.length > 0) currVersionID = currVersion.ID+"-"+currVersion.Sizes[0];

                setTimeout(()=>{
                    loginAPI().then(token => {
                        getProductsAPI(token, currVersionID).then(productData => {
                            if(productData){
                                if(productData.Images.length > 0){
                                    currVersion.Img = productData.Images[0].Image;
                                    currVersion.Images = productData.Images;
                                }
                                generatedProducts[i].Products[j].Img = productData.Model.Image;
                                currVersion.Description = productData.Model.Description;
                                if(productData.Model.Description2.length > productData.Model.Description.length)
                                    currVersion.Description = productData.Model.Description2;
                                currVersion.HTMLColor = productData.Shade.HtmlColor;
                            }
                            versionNum++;
                            if(versionNum >= generatedProducts[i].Products[j].versions.length){
                                productNum++;
                                if(productNum >= generatedProducts[i].Products.length){
                                    subCategoryNum++;
                                    let percent = Math.round(subCategoryNum / 34 * 100);
                                    let subCategoryNumDisplay = JSON.stringify(subCategoryNum).padStart(2, "0");
                                    console.log("Category Completed: "+subCategoryNumDisplay+"/34 Progress: "+percent+"%");
                                    if(subCategoryNum === 34){
                                        allProducts = generatedProducts;
                                        eventEmitter.emit("updated-all-products");
                                        console.log("\nRetrieving Product Image and Color Data Complete\n");

                                        fs.writeFile("./json/backup.json", JSON.stringify(generatedProducts, null, 4), (error)=>{
                                            if(error) console.log("\n\n\nBackup Write Error:\n\n", error);
                                        });
                                    }
                                }
                            }
                        }).catch(error => console.log("\n\n\nProduct API Error:\n\n", error));
                    }).catch(error => console.log("\n\n\nLogin Error:\n\n", error));
                }, i*1250);
            }
        }
    }
}

fs.readFile(process.env.API_BACKUP, (error, jsonData)=>{
    if(error) console.log("\n\n\nError reading JSON:\n\n", error);
    else{
        try{
            let backup = JSON.parse(jsonData);
            allProducts = backup;
            eventEmitter.emit("updated-all-products");
        }
        catch{
            fs.writeFile("./json/backup.json", JSON.stringify([], null, 4), (error)=>{
                if(error) console.log("\n\n\nBackup Write Error:\n\n", error);
            });
        }
    }
});
getProduct();
eventEmitter.on("updated-all-products", ()=>{
    io.emit("all-product-data", allProducts);
});