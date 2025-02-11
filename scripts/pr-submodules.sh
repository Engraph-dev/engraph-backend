if ! command -v gh &> /dev/null
then
	echo "gh is required to create pull requests from submodules";
	exit 1;
fi

read -p "Enter the target pull request branch: " PULLBRANCH

if [[ -z $PULLBRANCH ]]; then
	echo "A target pull request branch is necessary!";
	exit 1;
fi

cd prisma
gh pr create -B $PULLBRANCH

cd ../
cd src/util/defs
gh pr create -B $PULLBRANCH

cd ../../../