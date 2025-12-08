import axios from "axios";


const API = axios.create({
  baseURL: "http://192.168.0.194:4000/api/groups"
});

export const getUserGroups = (userId: string) =>
  API.get(`/user/${userId}`);


// CREATE group
export const createGroupApi = (data: {
  name: string;
  created_by: string;
  members: { user_id: string; role?: string }[];
}) => API.post("/", data);

// GET a single group
export const getGroupApi = (id: string) => API.get(`/${id}`);
