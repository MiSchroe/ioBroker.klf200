import type { IConnection, Products } from "klf-200-api";

/**
 * Interface for objects that have a connection.
 */
export interface HasConnectionInterface {
	/** The connection. */
	readonly Connection?: IConnection;
}

/**
 * Interface for objects that have products.
 */
export interface HasProductsInterface {
	/** The products. */
	readonly Products?: Products;
}
