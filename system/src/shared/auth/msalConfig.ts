import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "17c05679-4464-4598-b402-189af45cc0b8",
    authority: "https://login.microsoftonline.com/f82b0fb7-0101-410d-8e87-0efa7c1d3978",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ["User.Read"],
};
