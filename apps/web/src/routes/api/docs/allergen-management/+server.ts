import { readFileSync } from 'fs';
import { resolve } from 'path';

export async function GET() {
	try {
		// Read the markdown file from the project root's docs folder
		const filePath = resolve('../../docs/allergen-management.md');
		const fileContent = readFileSync(filePath, 'utf-8');
		return new Response(fileContent, {
			headers: { 'Content-Type': 'text/plain' }
		});
	} catch (err) {
		console.error('Failed to read docs/allergen-management.md', err);
		return new Response('Documentation not found', { status: 404 });
	}
}
