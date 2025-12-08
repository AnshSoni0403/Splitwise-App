import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model";

export const AuthController = {
  async signup(req: Request, res: Response) {
    try {
      const { username, name, email, password } = req.body;

      if (!username || !name || !email || !password)
        return res.status(400).json({ error: "All fields required" });

      // Check duplicates
      if (await UserModel.findByEmail(email))
        return res.status(409).json({ error: "Email already exists" });

      if (await UserModel.findByUsername(username))
        return res.status(409).json({ error: "Username already exists" });

      const hashedPass = await bcrypt.hash(password, 10);

      const user = await UserModel.createUser({
        username,
        name,
        email,
        password: hashedPass
      });

      return res.status(201).json({ user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.status(400).json({ error: "Email & password required" });

      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(404).json({ error: "User not found" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
      );

      return res.json({ token, user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};
