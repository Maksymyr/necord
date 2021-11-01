import { Injectable, Logger } from '@nestjs/common';
import { ApplicationCommandExecuteMetadata } from '../interfaces';
import { ApplicationCommandData, Collection, CommandInteraction, Interaction } from 'discord.js';
import { Context, On } from '../decorators';
import { ApplicationCommandTypes } from 'discord.js/typings/enums';

@Injectable()
export class ApplicationCommandsService {
	private readonly logger = new Logger(ApplicationCommandsService.name);

	private readonly applicationCommands = new Collection<string, ApplicationCommandData>();

	private readonly applicationCommandsMetadata = new Collection<string, ApplicationCommandExecuteMetadata>();

	@On('interactionCreate')
	private async onInteractionCreate(@Context() interaction: Interaction) {
		if (!interaction.isCommand()) return;

		const command = this.getCommand(interaction);

		if (command) {
			command.execute(interaction);
		}
	}

	public registerApplicationCommands(applicationCommands: Array<ApplicationCommandExecuteMetadata>) {
		try {
			this.logger.log('Started refreshing application (/) commands.');

			const commandGroups: Record<string, [string, ApplicationCommandExecuteMetadata[]]> = {};

			for (const command of applicationCommands) {
				let commandName;

				if (command.group) {
					const subGroupName = command.subGroup;
					const groupName = command.group;

					const prev = commandGroups[subGroupName]?.[1] ?? [];

					commandGroups[subGroupName] = [groupName, [...prev, command]];
					commandName = `${groupName}-${subGroupName}-${command.name}`;
				} else {
					commandName = command.name;

					const data: ApplicationCommandData = {
						type: command.type,
						name: command.name,
						description:
							command.type === ApplicationCommandTypes.CHAT_INPUT
								? command.description ?? 'Empty description'
								: '',
						options: command.options ?? []
					};

					this.applicationCommands.set(command.name, data);
				}

				this.applicationCommandsMetadata.set(commandName, command);
			}

			for (const subGroup in commandGroups) {
				const [groupName, cmds] = commandGroups[subGroup];
				const isSubGroup = subGroup !== 'undefined';
				const options = cmds.map(c => ({
					type: 1,
					name: c.name,
					description: c.description ?? 'Empty description',
					options: c.options
				}));

				const applicationData: ApplicationCommandData = this.applicationCommands.get(groupName) ?? {
					type: 1,
					name: groupName,
					description: `${groupName} commands`,
					options: []
				};

				if ('options' in applicationData) {
					applicationData.options = isSubGroup
						? applicationData.options.concat({
								type: 2,
								name: subGroup,
								description: `${subGroup} sub commands`,
								options
						  })
						: applicationData.options.concat(options);
				}

				this.applicationCommands.set(groupName, applicationData);
			}

			this.logger.log('Successfully reloaded application (/) commands.');
		} catch (err) {
			this.logger.error(err);
		}
	}

	public getApplicationCommands() {
		return [...this.applicationCommands.values()];
	}

	private getCommand(interaction: CommandInteraction) {
		let command: string;

		const commandName = interaction.commandName;
		const group = interaction.options.getSubcommandGroup(false);
		const subCommand = interaction.options.getSubcommand(false);

		if (subCommand) {
			if (group) {
				command = `${commandName}-${group}-${subCommand}`;
			} else {
				command = `${commandName}-undefined-${subCommand}`;
			}
		} else {
			command = commandName;
		}

		return this.applicationCommandsMetadata.get(command);
	}
}