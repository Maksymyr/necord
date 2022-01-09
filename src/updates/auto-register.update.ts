import { Inject, Injectable, Logger } from '@nestjs/common';
import { Context, Once } from '../decorators';
import { NECORD_MODULE_OPTIONS } from '../necord.constants';
import { ContextOf, NecordModuleOptions } from '../interfaces';
import { NecordRegistry } from '../necord-registry';
import { Client } from 'discord.js';

@Injectable()
export class AutoRegisterUpdate {
	private readonly logger = new Logger(AutoRegisterUpdate.name);

	public constructor(
		@Inject(NECORD_MODULE_OPTIONS)
		private readonly options: NecordModuleOptions,
		private readonly registry: NecordRegistry,
		private readonly client: Client
	) {}

	@Once('ready')
	public async onReady(@Context() [client]: ContextOf<'ready'>) {
		if (!this.options.initApplicationCommands) {
			return;
		}

		if (client.application.partial) {
			await client.application.fetch();
		}

		await this.registerCommands();
	}

	private async registerCommands() {
		const { initApplicationCommands } = this.options;

		this.logger.log(`Started refreshing application commands.`);
		await this.client.application.commands.set(
			this.registry.getApplicationCommands(),
			typeof initApplicationCommands === 'string' ? initApplicationCommands : undefined
		);
		this.logger.log(`Successfully reloaded application commands.`);
	}
}
