"use client";
import { createContext, useContext } from "react";

/** The signed-in dashboard user's role, so pages can hide controls that belong to the Backyard Manager. */
export const RoleCtx = createContext<string>("staff");
export const useRole = () => useContext(RoleCtx);
