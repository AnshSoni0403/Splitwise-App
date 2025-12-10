import axios from 'axios';

export const API = axios.create({
  baseURL: "http://192.168.0.194:4000/api" 
});

export const ping = () => API.get('/');
