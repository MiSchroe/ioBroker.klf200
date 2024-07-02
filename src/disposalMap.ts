import { Disposable } from "klf-200-api";

export class DisposalMap extends Map<string, Disposable> {
	/**
	 * disposeId
	 */
	public async disposeId(id: string): Promise<void> {
		const idList: string[] = [];

		// Get a list of matching ids.
		for (const key of this.keys()) {
			if (key.startsWith(id)) idList.push(key);
		}

		// Call the Dispose method of the Disposables and remove the id from the map.
		for (const key of idList) {
			await Promise.resolve(this.get(key)?.dispose());
			this.delete(key);
		}
	}

	public async disposeAll(): Promise<void> {
		for (const disposable of this.values()) {
			await Promise.resolve(disposable.dispose());
		}
		this.clear();
	}
}
