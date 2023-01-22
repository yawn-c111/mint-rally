import axios from "axios";
import { ACCESSTOKEN } from "src/constants/localstorage-keys";

class CloudFunctionClient {
  private jwtToken() {
    const jwt = localStorage.getItem(ACCESSTOKEN);
    return jwt ? jwt : null;
  }

  private axiosInstance(jwt: string | null) {
    if (jwt) {
      return axios.create({
        headers: {
          Authorization: `${jwt}`,
        },
      });
    } else {
      return axios.create();
    }
  }

  private apiUrl = (url: string) => {
    return process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONSBASEURL + url;
  };

  get = async (url: string) => {
    try {
      const jwt = await this.jwtToken();
      const { data } = await this.axiosInstance(jwt).get(this.apiUrl(url));
      return data;
    } catch (error: any) {
      throw error.response.data || {};
    }
  };

  post = async (url: string, d?: any) => {
    try {
      const jwt = await this.jwtToken();
      const { data } = await this.axiosInstance(jwt).post(this.apiUrl(url), d);
      return data;
    } catch (error: any) {
      throw error.response.data || {};
    }
  };

  put = async (url: string, d?: any) => {
    try {
      const jwt = await this.jwtToken();
      const { data } = await this.axiosInstance(jwt).put(this.apiUrl(url), d);
      return data;
    } catch (error: any) {
      throw error.response.data || {};
    }
  };

  delete = async (url: string) => {
    try {
      const jwt = await this.jwtToken();
      const { data } = await this.axiosInstance(jwt).delete(this.apiUrl(url));
      return data;
    } catch (error: any) {
      throw error.response.data || {};
    }
  };
}

export default new CloudFunctionClient();
