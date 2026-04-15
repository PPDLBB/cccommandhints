export interface CommandHint {
    cmd: string;
    desc: string;
}

export interface CommandGroup {
    name: string;
    color: string;
    commands: CommandHint[];
}