import deployment from "../../deployment.json";

export const contractAddress =
  deployment.contractAddress as `0x${string}` | "";
export const explorerBaseUrl = deployment.explorerBaseUrl;
export const contractExplorerUrl = contractAddress
  ? `${explorerBaseUrl}/address/${contractAddress}`
  : explorerBaseUrl;
