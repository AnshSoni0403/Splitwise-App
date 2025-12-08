import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.0.194:4000/api/auth" // replace with your IP
});

export const signupApi = (data: {
  username: string;
  name: string;
  email: string;
  password: string;
}) => API.post("/signup", data);

export const loginApi = (data: {
  email: string;
  password: string;
}) => API.post("/login", data);
