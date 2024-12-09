/*--Load Constants-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
import { createCanvas, loadImage } from "canvas";
import svgCaptcha from "svg-captcha";
import nodemailer from "nodemailer";
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
                    let dataToSend = {
                        versions:allProducts[i].Products[j].versions,
                        Found:productFound,
                    }
                    client.emit("studio-received", dataToSend);
                }
            }
            if(productFound) break;
        }
        if(!productFound) client.emit("studio-received", {Found:productFound});
    });
    client.on("request-final-images", (imageData, sendMail, id)=>{
        let loadedImages = [];
        for(let i = 0; i < imageData.length; i++){
            loadImage(imageData[i].src).then(image => {
                loadedImages[i] = image;
                let allLoaded = true;
                for(let j = 0; j < loadedImages.length; j++){
                    if(loadedImages[j] === undefined){
                        allLoaded = false;
                        break;
                    }
                }
                if(allLoaded) createFinalImage();
            });
        }

        function createFinalImage(){
            const canvas = createCanvas(1080, 1080);
            const ctx = canvas.getContext("2d");

            let editedImages = [];
            for(let i = 0; i < imageData.length; i++){
                let imgH = imageData[i].h * canvas.height;
                let imgW = imageData[i].w * canvas.width;
                let imgT = imageData[i].y * canvas.height;
                let imgL = imageData[i].x * canvas.width;

                const tempCanvas = createCanvas(1080, 1080);
                const ctxt = tempCanvas.getContext("2d");

                ctxt.beginPath();
                ctxt.save();
                ctxt.translate(imgL + imgW / 2, imgT + imgH / 2);
                ctxt.scale(imageData[i].scaleX, imageData[i].scaleY);
                ctxt.rotate(imageData[i].angle * Math.PI / 180);
                ctxt.drawImage(loadedImages[i], -imgW / 2, -imgH / 2, imgW, imgH);
                ctxt.restore();
                ctxt.closePath();

                if(i > 0) editedImages.push(tempCanvas.toDataURL());
                ctx.drawImage(tempCanvas, 0, 0);
            }

            let finalImage = canvas.toDataURL();
            if(!sendMail) client.emit("download-final-image", finalImage);
            else{
                let imgDataSend = [];
                if(imageData.length > 1){
                    for(let i = 1; i < imageData.length; i++){
                        imgDataSend.push({
                            originalImg:imageData[i].src,
                            editedImg:editedImages[i-1],
                            editedCoords:{
                                l:imageData[i].x,
                                t:imageData[i].y,
                                w:imageData[i].w,
                                h:imageData[i].h
                            }
                        });
                    }
                }
                sendEmail(id, imageData[0].src, imgDataSend, finalImage, client);
            }
        }
    });
    client.on("get-captcha", ()=>{
        let captcha = svgCaptcha.create();
        client.emit("receive-captcha", captcha);
    });
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
        switch(error.status){
            default:  console.error("\n\n\nProduct Error:\n\n", error); break;
            case 401: console.log("Authorization for product with ID:"+productID+" was denied:\n\n", error); break;
            case 404: console.log("Product with ID:"+productID+" is currenctly unavailable"); break;
        }
    });
    return product;
}

let allProducts = [], generatedProducts = [];
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
                        if(sizeIndex === -1){
                            let versionExists = false;
                            for(let p = 0; p < generatedProducts[j].Products[productIndex].versions.length; p++){
                                if(generatedProducts[j].Products[productIndex].versions[p].ID === ID){
                                    versionExists = true;
                                    break;
                                }
                            }
                            if(!versionExists) generatedProducts[j].Products[productIndex].versions.push(currVersion);
                        }
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
                                currVersion.ColorImage = productData.Shade.Image;
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
                }, (i*1500 + j*10 + k));
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

/*--Email--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function sendEmail(id, originalImage, imgDataSend, finalImage, client){
    let htmlText = "<h2>Artikal "+id+"</h2><b>Slika Artikla</b><br>Širina: 1080px<br>Visina: 1080px<br><br>";
    let attachmentData = generateEmailAttachments(originalImage, imgDataSend, finalImage);
    let attachments = attachmentData.attachments;
    htmlText += attachmentData.htmlText;

    const transporter = nodemailer.createTransport({
        host:process.env.LOGO_STUDIO_EMAIL_HOST,
        port:process.env.LOGO_STUDIO_EMAIL_PORT,
        secure:process.env.LOGO_STUDIO_SECURE,
        auth:{
            user:process.env.LOGO_STUDIO_SEND_EMAIL,
            pass:process.env.LOGO_STUDIO_SEND_PASSWORD,
        },
    });
    const emailData = {
        from:"Logo Studio <"+process.env.LOGO_STUDIO_SEND_EMAIL+">",
        to:process.env.LOGO_STUDIO_RECEIVE_EMAIL,
        subject:id,
        text:"",
        html:htmlText,
        attachments:attachments
    }
    transporter.sendMail(emailData, (error)=>{
        if(error){
            console.log("Email Error:"+error);
            client.emit("email-error");
        }
        else client.emit("email-success");
    });
}
function generateEmailAttachments(originalImage, imgDataSend, finalImage){
    let attachments = [], htmlText = "";
    attachments.push({filename:"Slika Artikla.png", path:originalImage});
    for(let i = 0; i < imgDataSend.length; i++){
        let index = i+1;
        let filenameO = "Originalna Slika "+index+".png";
        let filenameE = "Editovana Slika "+index+".png";
       
        attachments.push({
            filename:filenameO,
            path:imgDataSend[i].originalImg
        });
        attachments.push({
            filename:filenameE,
            path:imgDataSend[i].editedImg
        });

        let coordX = Math.round(imgDataSend[i].editedCoords.l * 1080);
        let coordY = Math.round(imgDataSend[i].editedCoords.t * 1080);
        let coordW = Math.round(imgDataSend[i].editedCoords.w * 1080);
        let coordH = Math.round(imgDataSend[i].editedCoords.h * 1080);

        let textL = "Daljina od leve ivice: "+coordX+"px<br>";
        let textT = "Daljina od gornje ivice: "+coordY+"px<br>";
        let textW = "Širina: "+coordW+"px<br>";
        let textH = "Visina: "+coordH+"px<br><br>";
        htmlText += "<b>Slika "+index+"</b><br>"+textL+textT+textW+textH;
    }
    attachments.push({filename:"Finalna Slika.png", path:finalImage});
    return {attachments:attachments, htmlText:htmlText};
}