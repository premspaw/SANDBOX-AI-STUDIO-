import {uploadToGCS as store} from './storageService.js';
export async function uploadToGCS(url,userId,type){return store(url,`users/${userId}/${type}/${Date.now()}.mp4`,'video/mp4');}
