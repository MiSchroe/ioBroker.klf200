import { IConnection, Products } from "klf-200-api";

export interface HasConnectionInterface {
	readonly Connection?: IConnection;
}

export interface HasProductsInterface {
	readonly Products?: Products;
}
