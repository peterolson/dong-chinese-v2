export interface CommonSource {
	/** Display name / pre-fill value */
	name: string;
	/** URL template with {char} placeholder, null for book sources */
	urlTemplate: string | null;
}

export const commonSources: CommonSource[] = [
	{
		name: '漢語多功能字庫',
		urlTemplate: 'http://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word={char}'
	},
	{ name: '季旭昇《說文新證》p.', urlTemplate: null },
	{ name: '李学勤《字源》p.', urlTemplate: null },
	{ name: 'zi.tools', urlTemplate: 'https://zi.tools/zi/{char}' },
	{
		name: 'Chinese Text Project',
		urlTemplate: 'https://ctext.org/dictionary.pl?if=en&char={char}'
	},
	{ name: '許進雄《簡明中國文字學》p.', urlTemplate: null }
];
