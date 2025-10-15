// import axios from 'axios';
import axios, { AxiosResponse } from 'axios';
import { CMP_BASE_URL } from './config';
// import { AuthData } from './types/auth';

interface OptiAuthData {
  provider: string;
  credentials: {
    token_type: string;
    access_token: string;
    org_sso_id: string;
    user_id: string;
    instance_id: string;
    customer_id: string;
    product_sku: string;
  };
}

function generateNumericId() {
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += Math.floor(Math.random() * 10); // digits 0-9
  }
  return id;
}


// helper to get asset details from  CMP
export const getAssetFromCMP = async (
  assetId: string,
  authData: OptiAuthData
) => {
  try {
    const headers = {
      Accept: 'application/json',
      'x-auth-token-type': 'opti-id',
      Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
      'Accept-Encoding': 'gzip',
      'x-request-id': generateNumericId(),
      'x-org-sso-id': authData.credentials.org_sso_id,
    };

    const url = `${CMP_BASE_URL}/v3/asset-urls/${assetId}`;

    const res: AxiosResponse = await axios.get(url, { headers });


    console.log('res.data ', res.data);
    return res.data;
  } catch (error: any) {
    console.error(`Failed to get task ${assetId}`, error.message);
    throw error;
  }
};
